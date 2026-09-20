import { q } from '../lib/turso'
import { newId, nowIso } from '../utils/helpers'
import type { Order, OrderItem, OrderStatus, Payment, PaymentMethod, PaymentStatus, OrderWithRelations } from '../types'

export interface OrderFilters {
  search?: string
  status?: OrderStatus
  payment_status?: PaymentStatus
  payment_method?: PaymentMethod
  date_from?: string
  date_to?: string
  branch_id?: string
  staff_id?: string
  page?: number
  limit?: number
}

export interface OrderListRow {
  id: string
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  intake_method: string
  return_method: string
  total_minor: number
  amount_paid_minor: number
  balance_minor: number
  expected_completion_at: string | null
  created_at: string
  updated_at: string
  customer_id: string
  customer_name: string
  customer_phone: string
  branch_name: string | null
  item_count: number
}

export async function listOrders(businessId: string, filters: OrderFilters): Promise<{ rows: OrderListRow[]; total: number }> {
  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const offset = (page - 1) * limit
  const where: string[] = ['o.business_id = ?']
  const args: unknown[] = [businessId]
  if (filters.search) {
    where.push('(o.order_number LIKE ? OR c.name LIKE ? OR c.phone_e164 LIKE ? OR c.phone_national LIKE ? OR o.id LIKE ?)')
    const like = `%${filters.search}%`
    args.push(like, like, like, like, like)
  }
  if (filters.status) {
    where.push('o.status = ?')
    args.push(filters.status)
  }
  if (filters.payment_status) {
    where.push('o.payment_status = ?')
    args.push(filters.payment_status)
  }
  if (filters.payment_method) {
    where.push(`o.id IN (SELECT order_id FROM payments p WHERE p.business_id = o.business_id AND p.method = ? AND p.type = 'PAYMENT')`)
    args.push(filters.payment_method)
  }
  if (filters.date_from) {
    where.push(`o.created_at >= ?`)
    args.push(`${filters.date_from}T00:00:00.000Z`)
  }
  if (filters.date_to) {
    where.push(`o.created_at <= ?`)
    args.push(`${filters.date_to}T23:59:59.999Z`)
  }
  if (filters.branch_id) {
    where.push('o.branch_id = ?')
    args.push(filters.branch_id)
  }
  if (filters.staff_id) {
    where.push('(o.created_by = ? OR o.id IN (SELECT order_id FROM pickups WHERE assigned_staff_id = ?))')
    args.push(filters.staff_id, filters.staff_id)
  }

  const countRes = await q(
    `SELECT COUNT(*) AS total FROM orders o JOIN customers c ON c.id = o.customer_id WHERE ${where.join(' AND ')}`,
    args,
  )
  const total = Number(countRes.rows[0]?.total ?? 0)
  const res = await q(
    `SELECT o.id, o.order_number, o.status, o.payment_status, o.intake_method, o.return_method,
            o.total_minor, o.amount_paid_minor, o.balance_minor, o.expected_completion_at,
            o.created_at, o.updated_at, o.customer_id, o.customer_notified_at,
            c.name AS customer_name, c.phone_e164 AS customer_phone, c.phone_national AS customer_national,
            b.name AS branch_name,
            (SELECT COALESCE(SUM(quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     LEFT JOIN branches b ON b.id = o.branch_id
     WHERE ${where.join(' AND ')}
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    [...args, limit, offset],
  )
  const rows = res.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      order_number: String(row.order_number),
      status: String(row.status) as OrderStatus,
      payment_status: String(row.payment_status) as PaymentStatus,
      intake_method: String(row.intake_method),
      return_method: String(row.return_method),
      total_minor: Number(row.total_minor ?? 0),
      amount_paid_minor: Number(row.amount_paid_minor ?? 0),
      balance_minor: Number(row.balance_minor ?? 0),
      expected_completion_at: row.expected_completion_at ? String(row.expected_completion_at) : null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      customer_id: String(row.customer_id),
      customer_name: String(row.customer_name ?? ''),
      customer_phone: String(row.customer_phone ?? ''),
      customer_national: String(row.customer_national ?? ''),
      branch_name: row.branch_name ? String(row.branch_name) : null,
      item_count: Number(row.item_count ?? 0),
    }
  })
  return { rows, total }
}

export function mapOrder(row: Record<string, unknown>): Order {
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    branch_id: row.branch_id ? String(row.branch_id) : null,
    order_number: String(row.order_number),
    customer_id: String(row.customer_id),
    status: String(row.status) as OrderStatus,
    payment_status: String(row.payment_status) as PaymentStatus,
    intake_method: String(row.intake_method) as Order['intake_method'],
    return_method: String(row.return_method) as Order['return_method'],
    pickup_id: row.pickup_id ? String(row.pickup_id) : null,
    delivery_id: row.delivery_id ? String(row.delivery_id) : null,
    discount_type: String(row.discount_type) as Order['discount_type'],
    discount_value_minor: Number(row.discount_value_minor ?? 0),
    discount_percent_bp: Number(row.discount_percent_bp ?? 0),
    subtotal_minor: Number(row.subtotal_minor ?? 0),
    discount_minor: Number(row.discount_minor ?? 0),
    tax_minor: Number(row.tax_minor ?? 0),
    total_minor: Number(row.total_minor ?? 0),
    amount_paid_minor: Number(row.amount_paid_minor ?? 0),
    balance_minor: Number(row.balance_minor ?? 0),
    expected_completion_at: row.expected_completion_at ? String(row.expected_completion_at) : null,
    ready_at: row.ready_at ? String(row.ready_at) : null,
    delivered_at: row.delivered_at ? String(row.delivered_at) : null,
    customer_notified_at: row.customer_notified_at ? String(row.customer_notified_at) : null,
    customer_notified_by: row.customer_notified_by ? String(row.customer_notified_by) : null,
    storage_location_id: row.storage_location_id ? String(row.storage_location_id) : null,
    storage_assigned_at: row.storage_assigned_at ? String(row.storage_assigned_at) : null,
    storage_released_at: row.storage_released_at ? String(row.storage_released_at) : null,
    notes: row.notes ? String(row.notes) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function findOrderById(businessId: string, orderId: string): Promise<Order | null> {
  const res = await q('SELECT * FROM orders WHERE id = ? AND business_id = ?', [orderId, businessId])
  return res.rows[0] ? mapOrder(res.rows[0] as Record<string, unknown>) : null
}

export async function findOrderByNumber(businessId: string, orderNumber: string): Promise<Order | null> {
  const res = await q('SELECT * FROM orders WHERE order_number = ? AND business_id = ?', [orderNumber, businessId])
  return res.rows[0] ? mapOrder(res.rows[0] as Record<string, unknown>) : null
}

async function mapOrderWithRelations(businessId: string, order: Order): Promise<OrderWithRelations> {
  const rel: OrderWithRelations = { ...order }

  const customerRes = await q('SELECT * FROM customers WHERE id = ? AND business_id = ?', [order.customer_id, businessId])
  if (customerRes.rows[0]) {
    const c = customerRes.rows[0] as Record<string, unknown>
    rel.customer = {
      id: String(c.id),
      business_id: String(c.business_id),
      name: String(c.name),
      phone_country: String(c.phone_country),
      phone_country_code: String(c.phone_country_code),
      phone_national: String(c.phone_national),
      phone_e164: String(c.phone_e164),
      email: c.email ? String(c.email) : null,
      notes: c.notes ? String(c.notes) : null,
      created_at: String(c.created_at),
      updated_at: String(c.updated_at),
    }
  }

  const itemsRes = await q(
    `SELECT oi.*, g.name AS garment_name, s.name AS service_name
     FROM order_items oi
     LEFT JOIN garment_types g ON g.id = oi.garment_type_id
     LEFT JOIN services s ON s.id = oi.service_id
     WHERE oi.order_id = ?`,
    [order.id],
  )
  rel.items = itemsRes.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      order_id: String(row.order_id),
      business_id: String(row.business_id),
      garment_type_id: String(row.garment_type_id),
      service_id: String(row.service_id),
      quantity: Number(row.quantity),
      unit_price_minor: Number(row.unit_price_minor),
      line_total_minor: Number(row.line_total_minor),
      notes: row.notes ? String(row.notes) : null,
      garment_name: row.garment_name ? String(row.garment_name) : undefined,
      service_name: row.service_name ? String(row.service_name) : undefined,
    }
  })

  const paymentsRes = await q(
    `SELECT p.*, u.name AS recorded_by_name
     FROM payments p LEFT JOIN users u ON u.id = p.recorded_by
     WHERE p.order_id = ? ORDER BY p.recorded_at ASC`,
    [order.id],
  )
  rel.payments = paymentsRes.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      business_id: String(row.business_id),
      order_id: String(row.order_id),
      type: String(row.type) as 'PAYMENT' | 'REFUND',
      amount_minor: Number(row.amount_minor),
      method: String(row.method) as Payment['method'],
      reference: row.reference ? String(row.reference) : null,
      note: row.note ? String(row.note) : null,
      recorded_by: row.recorded_by ? String(row.recorded_by) : null,
      recorded_at: String(row.recorded_at),
      created_at: String(row.created_at),
      recorded_by_name: row.recorded_by_name ? String(row.recorded_by_name) : null,
    } as Payment & { recorded_by_name: string | null }
  })

  const historyRes = await q(
    `SELECT osh.previous_status, osh.new_status, osh.changed_at, u.name AS changed_by_name
     FROM order_status_history osh LEFT JOIN users u ON u.id = osh.changed_by
     WHERE osh.order_id = ? ORDER BY osh.changed_at ASC`,
    [order.id],
  )
  rel.status_history = historyRes.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      previous_status: String(row.previous_status),
      new_status: String(row.new_status),
      changed_at: String(row.changed_at),
      changed_by_name: row.changed_by_name ? String(row.changed_by_name) : null,
    }
  })

  if (order.pickup_id) {
    const pRes = await q('SELECT * FROM pickups WHERE id = ? AND business_id = ?', [order.pickup_id, businessId])
    if (pRes.rows[0]) rel.pickup = pRes.rows[0] as unknown as OrderWithRelations['pickup']
  }
  if (order.delivery_id) {
    const dRes = await q('SELECT * FROM deliveries WHERE id = ? AND business_id = ?', [order.delivery_id, businessId])
    if (dRes.rows[0]) rel.delivery = dRes.rows[0] as unknown as OrderWithRelations['delivery']
  }

  if (order.created_by) {
    const uRes = await q('SELECT name FROM users WHERE id = ?', [order.created_by])
    if (uRes.rows[0]) rel.created_by_name = String((uRes.rows[0] as Record<string, unknown>).name)
  }

  return rel
}

export async function findOrderWithRelations(businessId: string, orderId: string): Promise<OrderWithRelations | null> {
  const order = await findOrderById(businessId, orderId)
  if (!order) return null
  return mapOrderWithRelations(businessId, order)
}

export async function findOrderWithRelationsByNumber(businessId: string, orderNumber: string): Promise<OrderWithRelations | null> {
  const order = await findOrderByNumber(businessId, orderNumber)
  if (!order) return null
  return mapOrderWithRelations(businessId, order)
}

export interface OrderStatements {
  metrics: Array<{ sql: string; args: unknown[] }>
  orderId: string
}

export async function recomputePaymentTotals(orderId: string): Promise<void> {
  const agg = await q(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'PAYMENT' THEN amount_minor ELSE 0 END), 0) AS paid,
       COALESCE(SUM(CASE WHEN type = 'REFUND' THEN amount_minor ELSE 0 END), 0) AS refunded
     FROM payments WHERE order_id = ?`,
    [orderId],
  )
  const row = agg.rows[0] as Record<string, unknown>
  const paid = Number(row.paid ?? 0)
  const refunded = Number(row.refunded ?? 0)
  const net = paid - refunded

  const orderRes = await q('SELECT total_minor FROM orders WHERE id = ?', [orderId])
  const total = Number((orderRes.rows[0] as Record<string, unknown> | undefined)?.total_minor ?? 0)

  let paymentStatus: string
  if (total === 0) {
    paymentStatus = 'PAID'
  } else if (net <= 0) {
    paymentStatus = refunded > 0 ? 'REFUNDED' : 'UNPAID'
  } else if (net >= total) {
    paymentStatus = 'PAID'
  } else {
    paymentStatus = 'PARTIALLY_PAID'
  }
  const balance = Math.max(total - net, 0)
  await q(
    `UPDATE orders SET amount_paid_minor = ?, balance_minor = ?, payment_status = ?, updated_at = ? WHERE id = ?`,
    [Math.max(net, 0), balance, paymentStatus, nowIso(), orderId],
  )
}

export async function updateStatusAndTimestamps(
  orderId: string,
  data: { status?: OrderStatus; ready_at?: string | null; delivered_at?: string | null; updated_at?: string },
): Promise<void> {
  await q('UPDATE orders SET status = COALESCE(?, status), ready_at = ?, delivered_at = ?, updated_at = ? WHERE id = ?', [
    data.status ?? null,
    data.ready_at === undefined ? null : data.ready_at,
    data.delivered_at === undefined ? null : data.delivered_at,
    data.updated_at ?? nowIso(),
    orderId,
  ])
}

export async function insertStatusHistory(data: { businessId: string; orderId: string; previous: string; next: string; changedBy: string | null; changedAt: string }): Promise<void> {
  await q(
    `INSERT INTO order_status_history (id, business_id, order_id, previous_status, new_status, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [newId(), data.businessId, data.orderId, data.previous, data.next, data.changedBy, data.changedAt],
  )
}

export async function markCustomerNotified(orderId: string, businessId: string, userId: string): Promise<boolean> {
  const res = await q(
    `UPDATE orders SET customer_notified_at = ?, customer_notified_by = ?, updated_at = ? WHERE id = ? AND business_id = ?`,
    [nowIso(), userId, nowIso(), orderId, businessId],
  )
  return Number(res.rowsAffected) > 0
}

export async function updateOrder(businessId: string, orderId: string, data: Partial<Pick<Order, 'notes' | 'expected_completion_at' | 'return_method'>>): Promise<Order | null> {
  const existing = await findOrderById(businessId, orderId)
  if (!existing) return null
  await q(
    `UPDATE orders SET notes = ?, expected_completion_at = ?, return_method = ?, updated_at = ? WHERE id = ? AND business_id = ?`,
    [data.notes === undefined ? existing.notes : data.notes, data.expected_completion_at === undefined ? existing.expected_completion_at : data.expected_completion_at, data.return_method ?? existing.return_method, nowIso(), orderId, businessId],
  )
  return (await findOrderById(businessId, orderId)) as Order
}

export async function linkOrderToDelivery(businessId: string, orderId: string, deliveryId: string | null): Promise<void> {
  await q(`UPDATE orders SET delivery_id = ?, updated_at = ? WHERE id = ? AND business_id = ?`, [
    deliveryId,
    nowIso(),
    orderId,
    businessId,
  ])
}

export async function insertOrderItem(item: OrderItem, orderId: string, businessId: string): Promise<void> {
  await q(
    `INSERT INTO order_items (id, order_id, business_id, garment_type_id, service_id, quantity, unit_price_minor, line_total_minor, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newId(), orderId, businessId, item.garment_type_id, item.service_id, item.quantity, item.unit_price_minor, item.line_total_minor, item.notes ?? null, nowIso()],
  )
}