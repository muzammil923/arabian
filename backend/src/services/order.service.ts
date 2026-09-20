import { q, execBatch } from '../lib/turso'
import { badRequest, conflict, forbidden, notFound, HttpError } from '../utils/http'
import { calculateOrderTotals } from '../utils/money'
import { nextSequence, formatSequenceNumber } from '../utils/sequence'
import { newId, nowIso } from '../utils/helpers'
import { findCustomerById } from '../repositories/customers'
import { findPricesForItems, findService, findGarment } from '../repositories/reference'
import { findOrderById, findOrderWithRelations, insertStatusHistory, markCustomerNotified, updateOrder as repoUpdateOrder, updateStatusAndTimestamps } from '../repositories/orders'
import { findPickup } from '../repositories/logistics'
import { autoReleaseOrderStorage } from './storage.service'
import { getBusinessContext, addExpectedCompletion } from './business.helper'
import type { AuthUser, Order, OrderStatus, OrderWithRelations } from '../types'

const ALLOWED_TRANSITIONS: Record<string, OrderStatus[]> = {
  RECEIVED: ['WASHING', 'CANCELLED'],
  WASHING: ['DRYING', 'CANCELLED', 'READY', 'DELIVERED'],
  DRYING: ['IRONING', 'CANCELLED', 'READY', 'DELIVERED'],
  IRONING: ['READY', 'CANCELLED', 'DELIVERED'],
  READY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['CANCELLED'],
  CANCELLED: ['RECEIVED'],
}

export function canTransition(from: OrderStatus | string, to: OrderStatus): boolean {
  if (from === to) return false
  const next = ALLOWED_TRANSITIONS[from]
  return !!next && next.includes(to)
}

export const ORDER_STATUS_AUDIT_ACTIONS: Record<string, string> = {
  WASHING: 'ORDER_STATUS_WASHING',
  DRYING: 'ORDER_STATUS_DRYING',
  IRONING: 'ORDER_STATUS_IRONING',
  READY: 'ORDER_STATUS_READY',
  DELIVERED: 'ORDER_STATUS_DELIVERED',
  CANCELLED: 'ORDER_CANCELLED',
}

export interface CreateOrderInput {
  customer_id: string
  branch_id?: string | null
  intake_method?: 'STORE_DROPOFF' | 'HOME_PICKUP'
  return_method: 'CUSTOMER_PICKUP' | 'HOME_DELIVERY'
  pickup_id?: string | null
  items: Array<{ garment_type_id: string; service_id: string; quantity: number; notes?: string | null }>
  discount?: { type?: 'NONE' | 'FIXED' | 'PERCENTAGE'; value_minor?: number; percent_bp?: number }
  advance?: { amount_minor: number; method: string; reference?: string | null; note?: string | null }
  expected_completion_at?: string | null
  notes?: string | null
  client_request_id?: string
}

export async function createOrder(auth: AuthUser, input: CreateOrderInput): Promise<OrderWithRelations> {
  const businessId = auth.businessId

  if (input.client_request_id) {
    const existing = await q('SELECT id FROM orders WHERE business_id = ? AND client_request_id = ?', [businessId, input.client_request_id])
    if (existing.rows[0]) {
      return (await findOrderWithRelations(businessId, String((existing.rows[0] as Record<string, unknown>).id))) as OrderWithRelations
    }
  }

  const ctx = await getBusinessContext(businessId)
  const customer = await findCustomerById(businessId, input.customer_id)
  if (!customer) throw notFound('Customer not found.')

  // Validate every garment & service belongs to the business.
  const seen = new Set<string>()
  for (const item of input.items) {
    const key = `${item.service_id}:${item.garment_type_id}`
    if (seen.has(key)) continue
    seen.add(key)
    const [service, garment] = await Promise.all([findService(businessId, item.service_id), findGarment(businessId, item.garment_type_id)])
    if (!service || !garment) throw badRequest('One of the selected services or garment types is invalid.', 'INVALID_ITEM')
    if (service.is_active === 0 || garment.is_active === 0) throw badRequest(`"${service.name}" or "${garment.name}" has been disabled.`, 'DISABLED_ITEM')
  }

  // Fetch the REAL pricing from the database. Never trust client prices.
  const priceMap = await findPricesForItems(
    businessId,
    Array.from(seen).map((key) => {
      const [serviceId, garmentTypeId] = key.split(':')
      return { serviceId, garmentTypeId }
    }),
  )
  const missing: string[] = []
  for (const key of seen) {
    if (!priceMap.has(key)) {
      const [garmentId, serviceId] = key.split(':')
      const garment = await findGarment(businessId, garmentId)
      const service = await findService(businessId, serviceId)
      missing.push(`${garment?.name ?? 'Item'} + ${service?.name ?? 'Service'}`)
    }
  }
  if (missing.length > 0) {
    throw conflict(`Pricing is not configured for: ${missing.join(', ')}.`, 'MISSING_PRICE')
  }

  const items = input.items.map((item) => {
    const unitPrice = priceMap.get(`${item.service_id}:${item.garment_type_id}`) as number
    return {
      garment_type_id: item.garment_type_id,
      service_id: item.service_id,
      quantity: item.quantity,
      unit_price_minor: unitPrice,
      line_total_minor: unitPrice * item.quantity,
      notes: item.notes ?? null,
    }
  })

  // Discount authorization: STAFF cannot apply discounts.
  const discountType = input.discount?.type ?? 'NONE'
  if (discountType !== 'NONE' && auth.role === 'STAFF') {
    throw forbidden('You do not have permission to apply discounts.')
  }

  const totals = calculateOrderTotals({
    items: items.map((i) => ({ unitPriceMinor: i.unit_price_minor, quantity: i.quantity })),
    discountType,
    discountValueMinor: input.discount?.value_minor ?? 0,
    discountPercentBp: input.discount?.percent_bp ?? 0,
    taxBp: ctx.business.tax_bp,
  })

  let advanceAmount = 0
  if (input.advance && input.advance.amount_minor > 0) {
    advanceAmount = input.advance.amount_minor
    if (advanceAmount > totals.totalMinor) {
      throw badRequest('Advance payment cannot exceed the order total.', 'ADVANCE_EXCEEDS_TOTAL')
    }
  }

  if (input.pickup_id) {
    const pickup = await findPickup(businessId, input.pickup_id)
    if (!pickup) throw notFound('Pickup not found.')
  }

  // Concurrency-safe order number via sequence counter.
  const seq = await nextSequence(businessId, 'ORDER')
  const orderNumber = formatSequenceNumber(ctx.settings.order_prefix, seq, ctx.settings.order_number_min_digits)
  const orderId = newId()
  const ts = nowIso()
  const expectedCompletion = input.expected_completion_at ?? (await addExpectedCompletion(businessId, ts))

  const initialPaymentStatus = totals.totalMinor === 0 || advanceAmount >= totals.totalMinor ? 'PAID' : advanceAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID'
  const balance = totals.totalMinor - advanceAmount

  const statements: Array<{ sql: string; args: unknown[] }> = [
    {
      sql: `INSERT INTO orders (
        id, business_id, branch_id, order_number, customer_id, status, payment_status,
        intake_method, return_method, pickup_id,
        discount_type, discount_value_minor, discount_percent_bp,
        subtotal_minor, discount_minor, tax_minor, total_minor, amount_paid_minor, balance_minor,
        expected_completion_at, notes, created_by, client_request_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'RECEIVED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        orderId,
        businessId,
        input.branch_id ?? null,
        orderNumber,
        input.customer_id,
        initialPaymentStatus,
        input.intake_method ?? 'STORE_DROPOFF',
        input.return_method,
        input.pickup_id ?? null,
        discountType,
        input.discount?.value_minor ?? 0,
        input.discount?.percent_bp ?? 0,
        totals.subtotalMinor,
        totals.discountMinor,
        totals.taxMinor,
        totals.totalMinor,
        advanceAmount,
        balance,
        expectedCompletion,
        input.notes ?? null,
        auth.id,
        input.client_request_id ?? null,
        ts,
        ts,
      ],
    },
    ...items.map((item) => ({
      sql: `INSERT INTO order_items (id, order_id, business_id, garment_type_id, service_id, quantity, unit_price_minor, line_total_minor, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [newId(), orderId, businessId, item.garment_type_id, item.service_id, item.quantity, item.unit_price_minor, item.line_total_minor, item.notes, ts],
    })),
    {
      sql: `INSERT INTO order_status_history (id, business_id, order_id, previous_status, new_status, changed_by, changed_at)
            VALUES (?, ?, ?, 'SYSTEM', 'RECEIVED', ?, ?)`,
      args: [newId(), businessId, orderId, auth.id, ts],
    },
    {
      sql: `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at)
            VALUES (?, ?, ?, 'order_created', 'order', ?, ?, ?)`,
      args: [newId(), businessId, auth.id, orderId, JSON.stringify({ order_number: orderNumber, total_minor: totals.totalMinor }), ts],
    },
  ]

  if (advanceAmount > 0) {
    statements.push({
      sql: `INSERT INTO payments (id, business_id, order_id, type, amount_minor, method, reference, note, recorded_by, client_request_id, recorded_at, created_at)
            VALUES (?, ?, ?, 'PAYMENT', ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [newId(), businessId, orderId, advanceAmount, input.advance!.method, input.advance?.reference ?? null, input.advance?.note ?? null, auth.id, null, ts, ts],
    })
    statements.push({
      sql: `UPDATE orders SET
              amount_paid_minor = ?,
              balance_minor = MAX(total_minor - ?, 0),
              payment_status = CASE
                WHEN total_minor <= 0 THEN 'PAID'
                WHEN ? >= total_minor THEN 'PAID'
                WHEN ? > 0 THEN 'PARTIALLY_PAID'
                ELSE 'UNPAID' END,
              updated_at = ?
            WHERE id = ?`,
      args: [advanceAmount, advanceAmount, advanceAmount, advanceAmount, ts, orderId],
    })
  }

  if (input.pickup_id) {
    statements.push({
      sql: `UPDATE pickups SET order_id = ?, updated_at = ? WHERE id = ? AND business_id = ?`,
      args: [orderId, ts, input.pickup_id, businessId],
    })
  }

  try {
    await execBatch(statements, 'write')
  } catch (err) {
    const e = err as { code?: string }
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE' || e.code?.startsWith('SQLITE_CONSTRAINT')) {
      // Extremely unlikely (single-writer counter), but recover safely.
      const retrySeq = await nextSequence(businessId, 'ORDER')
      const retryNumber = formatSequenceNumber(ctx.settings.order_prefix, retrySeq, ctx.settings.order_number_min_digits)
      statements[0].args[3] = retryNumber
      statements.find((s) => s.sql.startsWith('INSERT INTO audit_logs'))!.args[5] = JSON.stringify({ order_number: retryNumber, total_minor: totals.totalMinor })
      await execBatch(statements, 'write')
      return (await findOrderWithRelations(businessId, orderId)) as OrderWithRelations
    }
    throw err
  }

  return (await findOrderWithRelations(businessId, orderId)) as OrderWithRelations
}

export async function updateOrderDetails(auth: AuthUser, orderId: string, data: { notes?: string | null; expected_completion_at?: string | null; return_method?: 'CUSTOMER_PICKUP' | 'HOME_DELIVERY' }) {
  const order = await findOrderById(auth.businessId, orderId)
  if (!order) throw notFound('Order not found.')
  if (order.status === 'CANCELLED') throw badRequest('Cannot edit a cancelled order.', 'ORDER_CANCELLED')
  const updated = await repoUpdateOrder(auth.businessId, orderId, data)
  await q(
    `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, 'order', ?, ?, ?)`,
    [newId(), auth.businessId, auth.id, 'order_updated', orderId, JSON.stringify({ changed: data }), nowIso()],
  )
  return updated
}

export async function changeOrderStatus(auth: AuthUser, orderId: string, status: OrderStatus, opts: { force?: boolean; note?: string | null }): Promise<OrderWithRelations> {
  const businessId = auth.businessId
  const order = await findOrderById(businessId, orderId)
  if (!order) throw notFound('Order not found.')

  if (status === order.status) throw badRequest(`Order is already ${status}.`, 'SAME_STATUS')

  let allowed = canTransition(order.status, status)
  if (!allowed && opts.force) {
    const canForce = auth.role === 'OWNER' || auth.role === 'ADMIN' || auth.role === 'MANAGER'
    if (!canForce) throw forbidden('Only managers can skip statuses.')
    allowed = true
  }
  if (!allowed) {
    throw badRequest(`Cannot change order from ${order.status} to ${status}.`, 'INVALID_TRANSITION', {
      previous_status: order.status,
      requested_status: status,
    })
  }

  const ts = nowIso()
  await updateStatusAndTimestamps(orderId, {
    status,
    ready_at: status === 'READY' ? ts : status === 'DELIVERED' ? (order.ready_at ?? ts) : null,
    delivered_at: status === 'DELIVERED' ? ts : null,
  })
  await insertStatusHistory({ businessId, orderId, previous: order.status, next: status, changedBy: auth.id, changedAt: ts })
  await q(
    `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, 'order', ?, ?, ?)`,
    [newId(), businessId, auth.id, ORDER_STATUS_AUDIT_ACTIONS[status] ?? 'order_status_changed', orderId, JSON.stringify({ previous_status: order.status, new_status: status, note: opts.note ?? null }), ts],
  )

  if (status === 'DELIVERED') {
    await autoReleaseOrderStorage(businessId, orderId, auth.id)
  }

  return (await findOrderWithRelations(businessId, orderId)) as OrderWithRelations
}

export async function markNotified(auth: AuthUser, orderId: string, notified: boolean): Promise<OrderWithRelations> {
  const businessId = auth.businessId
  if (notified) {
    const ok = await markCustomerNotified(orderId, businessId, auth.id)
    if (!ok) throw notFound('Order not found.')
  } else {
    await q(`UPDATE orders SET customer_notified_at = NULL, customer_notified_by = NULL, updated_at = ? WHERE id = ? AND business_id = ?`, [
      nowIso(),
      orderId,
      businessId,
    ])
  }
  await q(
    `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, 'customer_marked_notified', 'order', ?, ?, ?)`,
    [newId(), businessId, auth.id, orderId, JSON.stringify({ notified }), nowIso()],
  )
  return (await findOrderWithRelations(businessId, orderId)) as OrderWithRelations
}

export async function getPaymentAndBalanceContext(businessId: string, orderId: string): Promise<{ order: Order }> {
  const order = await findOrderById(businessId, orderId)
  if (!order) throw new HttpError(404, 'Order not found.')
  return { order }
}