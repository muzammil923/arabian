import { q, execBatch } from '../lib/turso'
import { badRequest, HttpError } from '../utils/http'
import { newId, nowIso } from '../utils/helpers'
import { findOrderById, findOrderWithRelations } from '../repositories/orders'
import type { AuthUser, PaymentMethod, OrderWithRelations, Payment } from '../types'

const NET_PAID_SELECT = `SELECT COALESCE(SUM(CASE WHEN type = 'PAYMENT' THEN amount_minor ELSE -amount_minor END), 0) AS net FROM payments WHERE order_id = ?`

export async function recordPayment(
  businessId: string,
  orderId: string,
  auth: AuthUser,
  data: { amount_minor: number; method: PaymentMethod; reference?: string | null; note?: string | null },
  clientRequestId?: string,
): Promise<OrderWithRelations> {
  const order = await findOrderById(businessId, orderId)
  if (!order) throw new HttpError(404, 'Order not found.')
  if (order.status === 'CANCELLED') throw badRequest('Cannot record a payment on a cancelled order.', 'ORDER_CANCELLED')

  if (clientRequestId) {
    const dup = await q('SELECT id FROM payments WHERE order_id = ? AND client_request_id = ?', [orderId, clientRequestId])
    if (dup.rows[0]) return (await findOrderWithRelations(businessId, orderId)) as OrderWithRelations
  }

  if (data.amount_minor > order.balance_minor) {
    throw badRequest('Amount exceeds the outstanding balance.', 'OVERPAYMENT')
  }

  const netRes = await q(NET_PAID_SELECT, [orderId])
  const netPaid = Number((netRes.rows[0] as Record<string, unknown>).net ?? 0) + data.amount_minor

  const paymentId = newId()
  const ts = nowIso()
  const statements: Array<{ sql: string; args: unknown[] }> = [
    {
      sql: `INSERT INTO payments (id, business_id, order_id, type, amount_minor, method, reference, note, recorded_by, client_request_id, recorded_at, created_at)
            VALUES (?, ?, ?, 'PAYMENT', ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [paymentId, businessId, orderId, data.amount_minor, data.method, data.reference ?? null, data.note ?? null, auth.id, clientRequestId ?? null, ts, ts],
    },
    {
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
      args: [netPaid, netPaid, netPaid, netPaid, ts, orderId],
    },
    {
      sql: `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at)
            VALUES (?, ?, ?, 'payment_recorded', 'payment', ?, ?, ?)`,
      args: [newId(), businessId, auth.id, paymentId, JSON.stringify({ order_id: orderId, amount_minor: data.amount_minor, method: data.method }), ts],
    },
  ]
  await execBatch(statements, 'write')
  return (await findOrderWithRelations(businessId, orderId)) as OrderWithRelations
}

export async function refundOrder(
  businessId: string,
  orderId: string,
  auth: AuthUser,
  data: { amount_minor: number; method?: PaymentMethod; note?: string | null },
): Promise<OrderWithRelations> {
  const order = await findOrderById(businessId, orderId)
  if (!order) throw new HttpError(404, 'Order not found.')

  const paidRes = await q(NET_PAID_SELECT, [orderId])
  const netPaid = Number((paidRes.rows[0] as Record<string, unknown>).net ?? 0)
  if (data.amount_minor > netPaid) {
    throw badRequest('Refund amount cannot exceed the amount paid.', 'REFUND_EXCEEDS_PAID')
  }
  const netAfter = netPaid - data.amount_minor

  const ts = nowIso()
  const statements: Array<{ sql: string; args: unknown[] }> = [
    {
      sql: `INSERT INTO payments (id, business_id, order_id, type, amount_minor, method, reference, note, recorded_by, recorded_at, created_at)
            VALUES (?, ?, ?, 'REFUND', ?, ?, NULL, ?, ?, ?, ?)`,
      args: [newId(), businessId, orderId, data.amount_minor, data.method ?? 'CASH', data.note ?? null, auth.id, ts, ts],
    },
    {
      sql: `UPDATE orders SET
              amount_paid_minor = ?,
              balance_minor = MAX(total_minor - ?, 0),
              payment_status = CASE
                WHEN total_minor <= 0 THEN 'PAID'
                WHEN ? <= 0 AND (SELECT COUNT(*) FROM payments WHERE order_id = ? AND type = 'REFUND') > 0 THEN 'REFUNDED'
                WHEN ? >= total_minor THEN 'PAID'
                WHEN ? > 0 THEN 'PARTIALLY_PAID'
                ELSE 'UNPAID' END,
              updated_at = ?
            WHERE id = ?`,
      args: [netAfter, netAfter, netAfter, orderId, netAfter, netAfter, ts, orderId],
    },
    {
      sql: `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at)
            VALUES (?, ?, ?, 'refund_recorded', 'payment', ?, ?, ?)`,
      args: [newId(), businessId, auth.id, newId(), JSON.stringify({ order_id: orderId, amount_minor: data.amount_minor }), ts],
    },
  ]
  await execBatch(statements, 'write')
  return (await findOrderWithRelations(businessId, orderId)) as OrderWithRelations
}

export async function listOrderPayments(businessId: string, orderId: string): Promise<Payment[]> {
  const order = await findOrderById(businessId, orderId)
  if (!order) throw new HttpError(404, 'Order not found.')
  const res = await q(
    `SELECT p.*, u.name AS recorded_by_name FROM payments p LEFT JOIN users u ON u.id = p.recorded_by WHERE p.order_id = ? ORDER BY p.recorded_at ASC`,
    [orderId],
  )
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      business_id: String(row.business_id),
      order_id: String(row.order_id),
      type: String(row.type) as 'PAYMENT' | 'REFUND',
      amount_minor: Number(row.amount_minor),
      method: String(row.method) as PaymentMethod,
      reference: row.reference ? String(row.reference) : null,
      note: row.note ? String(row.note) : null,
      recorded_by: row.recorded_by ? String(row.recorded_by) : null,
      recorded_at: String(row.recorded_at),
      created_at: String(row.created_at),
    }
  })
}