import { q } from '../lib/turso'
import { newId, nowIso } from '../utils/helpers'
import type { Delivery, DeliveryStatus, Pickup, PickupStatus } from '../types'

export interface AddressSnapshot {
  label: string
  address_line_1: string
  address_line_2: string | null
  landmark: string | null
  city: string | null
  state_region: string | null
  postal_code: string | null
  country_code: string
}

export function parseSnapshot(json: string): AddressSnapshot {
  try {
    return JSON.parse(json) as AddressSnapshot
  } catch {
    return { label: 'Home', address_line_1: '', address_line_2: null, landmark: null, city: null, state_region: null, postal_code: null, country_code: 'IN' }
  }
}

export function snapshotAddress(s: AddressSnapshot): string {
  return JSON.stringify(s)
}

export function shortAddress(s: AddressSnapshot): string {
  const parts = [s.address_line_1, s.city, s.state_region, s.postal_code, s.country_code ? getCountryName(s.country_code) : null].filter(
    (p): p is string => !!p,
  )
  return parts.slice(0, 3).join(', ')
}

export function getCountryName(code: string): string {
  const names: Record<string, string> = {
    IN: 'India', AE: 'UAE', GB: 'UK', US: 'USA', CA: 'Canada', AU: 'Australia', SA: 'Saudi Arabia', QA: 'Qatar', SG: 'Singapore', MY: 'Malaysia', TH: 'Thailand', DE: 'Germany', FR: 'France', KR: 'South Korea', JP: 'Japan', ID: 'Indonesia', PK: 'Pakistan', BD: 'Bangladesh', LK: 'Sri Lanka', NP: 'Nepal', EG: 'Egypt', NG: 'Nigeria', KE: 'Kenya', BR: 'Brazil', MX: 'Mexico', AE2: ''
  }
  return names[code] ?? code
}

export interface PickupRow {
  id: string
  business_id: string
  branch_id: string | null
  order_id: string | null
  customer_id: string
  status: PickupStatus
  address_snapshot: string
  scheduled_date: string
  scheduled_slot: string | null
  instructions: string | null
  assigned_staff_id: string | null
  picked_up_at: string | null
  arrived_at: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  customer_name?: string
  customer_phone?: string
  customer_phone_national?: string
  staff_name?: string | null
  order_number?: string | null
}

export async function listPickups(
  businessId: string,
  opts: { filter?: string; page?: number; limit?: number; today?: string },
): Promise<{ rows: PickupRow[]; total: number }> {
  const page = opts.page ?? 1
  const limit = opts.limit ?? 20
  const offset = (page - 1) * limit
  let filterSql = 'p.business_id = ?'
  const args: unknown[] = [businessId]
  if (opts.filter === 'today') {
    filterSql += ' AND p.scheduled_date = ? AND p.status != ?'
    args.push(opts.today ?? ('1900-01-01' as string), 'CANCELLED')
  } else if (opts.filter === 'upcoming') {
    filterSql += ' AND p.scheduled_date >= ? AND p.status NOT IN (?, ?, ?)'
    args.push(opts.today ?? '1900-01-01', 'CANCELLED', 'ARRIVED_AT_STORE', 'PICKED_UP')
  } else if (opts.filter === 'completed') {
    filterSql += ' AND p.status IN (?, ?)'
    args.push('PICKED_UP', 'ARRIVED_AT_STORE')
  } else if (opts.filter === 'cancelled') {
    filterSql += ' AND p.status = ?'
    args.push('CANCELLED')
  } else if (opts.filter === 'ready') {
    filterSql += ' AND p.status = ?'
    args.push('SCHEDULED')
  } else if (opts.filter === 'scheduled') {
    filterSql += ' AND p.status IN (?, ?, ?)'
    args.push('SCHEDULED', 'ASSIGNED', 'OUT_FOR_PICKUP')
  }

  const countRes = await q(`SELECT COUNT(*) AS total FROM pickups p WHERE ${filterSql}`, args)
  const total = Number(countRes.rows[0]?.total ?? 0)

  const res = await q(
    `SELECT p.*, c.name AS customer_name, c.phone_e164 AS customer_phone, c.phone_national AS customer_phone_national,
            u.name AS staff_name, o.order_number
     FROM pickups p
     JOIN customers c ON c.id = p.customer_id
     LEFT JOIN users u ON u.id = p.assigned_staff_id
     LEFT JOIN orders o ON o.id = p.order_id
     WHERE ${filterSql}
     ORDER BY p.scheduled_date ASC, p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...args, limit, offset],
  )
  const rows = res.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      business_id: String(row.business_id),
      branch_id: row.branch_id ? String(row.branch_id) : null,
      order_id: row.order_id ? String(row.order_id) : null,
      customer_id: String(row.customer_id),
      status: String(row.status) as PickupStatus,
      address_snapshot: String(row.address_snapshot),
      scheduled_date: String(row.scheduled_date),
      scheduled_slot: row.scheduled_slot ? String(row.scheduled_slot) : null,
      instructions: row.instructions ? String(row.instructions) : null,
      assigned_staff_id: row.assigned_staff_id ? String(row.assigned_staff_id) : null,
      picked_up_at: row.picked_up_at ? String(row.picked_up_at) : null,
      arrived_at: row.arrived_at ? String(row.arrived_at) : null,
      cancelled_at: row.cancelled_at ? String(row.cancelled_at) : null,
      cancelled_by: row.cancelled_by ? String(row.cancelled_by) : null,
      notes: row.notes ? String(row.notes) : null,
      created_by: row.created_by ? String(row.created_by) : null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      customer_name: row.customer_name ? String(row.customer_name) : '',
      customer_phone: row.customer_phone ? String(row.customer_phone) : '',
      customer_phone_national: row.customer_phone_national ? String(row.customer_phone_national) : '',
      staff_name: row.staff_name ? String(row.staff_name) : null,
      order_number: row.order_number ? String(row.order_number) : null,
    }
  })
  return { rows, total }
}

export async function findPickup(businessId: string, id: string): Promise<PickupRow | null> {
  const res = await q(
    `SELECT p.*, c.name AS customer_name, c.phone_e164 AS customer_phone, c.phone_national AS customer_phone_national, c.name AS cn,
            u.name AS staff_name, o.order_number
     FROM pickups p
     JOIN customers c ON c.id = p.customer_id
     LEFT JOIN users u ON u.id = p.assigned_staff_id
     LEFT JOIN orders o ON o.id = p.order_id
     WHERE p.id = ? AND p.business_id = ?`,
    [id, businessId],
  )
  if (!res.rows[0]) return null
  const row = res.rows[0] as Record<string, unknown>
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    branch_id: row.branch_id ? String(row.branch_id) : null,
    order_id: row.order_id ? String(row.order_id) : null,
    customer_id: String(row.customer_id),
    status: String(row.status) as PickupStatus,
    address_snapshot: String(row.address_snapshot),
    scheduled_date: String(row.scheduled_date),
    scheduled_slot: row.scheduled_slot ? String(row.scheduled_slot) : null,
    instructions: row.instructions ? String(row.instructions) : null,
    assigned_staff_id: row.assigned_staff_id ? String(row.assigned_staff_id) : null,
    picked_up_at: row.picked_up_at ? String(row.picked_up_at) : null,
    arrived_at: row.arrived_at ? String(row.arrived_at) : null,
    cancelled_at: row.cancelled_at ? String(row.cancelled_at) : null,
    cancelled_by: row.cancelled_by ? String(row.cancelled_by) : null,
    notes: row.notes ? String(row.notes) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    customer_name: row.customer_name ? String(row.customer_name) : '',
    customer_phone: row.customer_phone ? String(row.customer_phone) : '',
    customer_phone_national: row.customer_phone_national ? String(row.customer_phone_national) : '',
    staff_name: row.staff_name ? String(row.staff_name) : null,
    order_number: row.order_number ? String(row.order_number) : null,
  }
}

export async function createPickup(data: {
  businessId: string
  customerId: string
  scheduledDate: string
  scheduledSlot?: string | null
  instructions?: string | null
  assignedStaffId?: string | null
  addressSnapshot: string
  notes?: string | null
  createdBy?: string | null
  branchId?: string | null
}): Promise<string> {
  const id = newId()
  const ts = nowIso()
  await q(
    `INSERT INTO pickups (id, business_id, branch_id, customer_id, status, address_snapshot, scheduled_date, scheduled_slot, instructions, assigned_staff_id, notes, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'SCHEDULED', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.businessId,
      data.branchId ?? null,
      data.customerId,
      data.addressSnapshot,
      data.scheduledDate,
      data.scheduledSlot ?? null,
      data.instructions ?? null,
      data.assignedStaffId ?? null,
      data.notes ?? null,
      data.createdBy ?? null,
      ts,
      ts,
    ],
  )
  return id
}

export async function updatePickup(businessId: string, id: string, data: Partial<Pickup>): Promise<PickupRow | null> {
  const existing = await findPickup(businessId, id)
  if (!existing) return null
  await q(
    `UPDATE pickups SET
       scheduled_date = ?, scheduled_slot = ?, instructions = ?, assigned_staff_id = ?,
       address_snapshot = ?, notes = ?, updated_at = ?
     WHERE id = ? AND business_id = ?`,
    [
      data.scheduled_date ?? existing.scheduled_date,
      data.scheduled_slot === undefined ? existing.scheduled_slot : data.scheduled_slot,
      data.instructions === undefined ? existing.instructions : data.instructions,
      data.assigned_staff_id === undefined ? existing.assigned_staff_id : data.assigned_staff_id,
      data.address_snapshot ?? existing.address_snapshot,
      data.notes === undefined ? existing.notes : data.notes,
      nowIso(),
      id,
      businessId,
    ],
  )
  return findPickup(businessId, id)
}

export async function setPickupStatus(
  businessId: string,
  id: string,
  data: { status: PickupStatus; pickedUpAt?: string | null; arrivedAt?: string | null; cancelledAt?: string | null; cancelledBy?: string | null },
): Promise<PickupRow | null> {
  await q(
    `UPDATE pickups SET status = ?, picked_up_at = ?, arrived_at = ?, cancelled_at = ?, cancelled_by = ?, updated_at = ?
     WHERE id = ? AND business_id = ?`,
    [
      data.status,
      data.pickedUpAt === undefined ? null : data.pickedUpAt,
      data.arrivedAt === undefined ? null : data.arrivedAt,
      data.cancelledAt === undefined ? null : data.cancelledAt,
      data.cancelledBy === undefined ? null : data.cancelledBy,
      nowIso(),
      id,
      businessId,
    ],
  )
  return findPickup(businessId, id)
}

// ----- Deliveries -----

export interface DeliveryRow {
  id: string
  business_id: string
  branch_id: string | null
  order_id: string
  customer_id: string
  status: DeliveryStatus
  address_snapshot: string
  scheduled_date: string | null
  scheduled_slot: string | null
  instructions: string | null
  assigned_staff_id: string | null
  delivered_at: string | null
  failed_at: string | null
  failure_reason: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  customer_name?: string
  customer_phone?: string
  customer_phone_national?: string
  staff_name?: string | null
  order_number?: string
  order_total_minor?: number
  order_balance_minor?: number
}

export async function listDeliveries(
  businessId: string,
  opts: { filter?: string; page?: number; limit?: number; today?: string },
): Promise<{ rows: DeliveryRow[]; total: number }> {
  const page = opts.page ?? 1
  const limit = opts.limit ?? 20
  const offset = (page - 1) * limit
  let filterSql = 'd.business_id = ?'
  const args: unknown[] = [businessId]
  if (opts.filter === 'ready') {
    filterSql += ' AND d.status = ?'
    args.push('SCHEDULED')
  } else if (opts.filter === 'today') {
    filterSql += ' AND d.scheduled_date = ? AND d.status NOT IN (?, ?, ?)'
    args.push(opts.today ?? '1900-01-01', 'DELIVERED', 'FAILED', 'CANCELLED')
  } else if (opts.filter === 'scheduled') {
    filterSql += ' AND d.status IN (?, ?, ?)'
    args.push('SCHEDULED', 'ASSIGNED', 'OUT_FOR_DELIVERY')
  } else if (opts.filter === 'out') {
    filterSql += ' AND d.status = ?'
    args.push('OUT_FOR_DELIVERY')
  } else if (opts.filter === 'delivered') {
    filterSql += ' AND d.status = ?'
    args.push('DELIVERED')
  } else if (opts.filter === 'failed') {
    filterSql += ' AND d.status = ?'
    args.push('FAILED')
  } else if (opts.filter === 'cancelled') {
    filterSql += ' AND d.status = ?'
    args.push('CANCELLED')
  } else if (opts.filter === 'upcoming') {
    filterSql += ' AND d.scheduled_date >= ? AND d.status NOT IN (?, ?, ?, ?)'
    args.push(opts.today ?? '1900-01-01', 'DELIVERED', 'FAILED', 'CANCELLED', 'OUT_FOR_DELIVERY')
  }

  const countRes = await q(`SELECT COUNT(*) AS total FROM deliveries d WHERE ${filterSql}`, args)
  const total = Number(countRes.rows[0]?.total ?? 0)

  const res = await q(
    `SELECT d.*, c.name AS customer_name, c.phone_e164 AS customer_phone, c.phone_national AS customer_phone_national,
            u.name AS staff_name, o.order_number, o.total_minor AS order_total_minor, o.balance_minor AS order_balance_minor
     FROM deliveries d
     JOIN customers c ON c.id = d.customer_id
     JOIN orders o ON o.id = d.order_id
     LEFT JOIN users u ON u.id = d.assigned_staff_id
     WHERE ${filterSql}
     ORDER BY COALESCE(d.scheduled_date, '9999') ASC, d.created_at DESC
     LIMIT ? OFFSET ?`,
    [...args, limit, offset],
  )
  const rows = res.rows.map((r) => mapDeliveryRow(r as Record<string, unknown>))
  return { rows, total }
}

export function mapDeliveryRow(row: Record<string, unknown>): DeliveryRow {
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    branch_id: row.branch_id ? String(row.branch_id) : null,
    order_id: String(row.order_id),
    customer_id: String(row.customer_id),
    status: String(row.status) as DeliveryStatus,
    address_snapshot: String(row.address_snapshot),
    scheduled_date: row.scheduled_date ? String(row.scheduled_date) : null,
    scheduled_slot: row.scheduled_slot ? String(row.scheduled_slot) : null,
    instructions: row.instructions ? String(row.instructions) : null,
    assigned_staff_id: row.assigned_staff_id ? String(row.assigned_staff_id) : null,
    delivered_at: row.delivered_at ? String(row.delivered_at) : null,
    failed_at: row.failed_at ? String(row.failed_at) : null,
    failure_reason: row.failure_reason ? String(row.failure_reason) : null,
    cancelled_at: row.cancelled_at ? String(row.cancelled_at) : null,
    cancelled_by: row.cancelled_by ? String(row.cancelled_by) : null,
    notes: row.notes ? String(row.notes) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    customer_name: row.customer_name ? String(row.customer_name) : '',
    customer_phone: row.customer_phone ? String(row.customer_phone) : '',
    customer_phone_national: row.customer_phone_national ? String(row.customer_phone_national) : '',
    staff_name: row.staff_name ? String(row.staff_name) : null,
    order_number: row.order_number ? String(row.order_number) : undefined,
    order_total_minor: row.order_total_minor === undefined ? undefined : Number(row.order_total_minor),
    order_balance_minor: row.order_balance_minor === undefined ? undefined : Number(row.order_balance_minor),
  }
}

export async function findDelivery(businessId: string, id: string): Promise<DeliveryRow | null> {
  const res = await q(
    `SELECT d.*, c.name AS customer_name, c.phone_e164 AS customer_phone, c.phone_national AS customer_phone_national,
            u.name AS staff_name, o.order_number, o.total_minor AS order_total_minor, o.balance_minor AS order_balance_minor
     FROM deliveries d
     JOIN customers c ON c.id = d.customer_id
     JOIN orders o ON o.id = d.order_id
     LEFT JOIN users u ON u.id = d.assigned_staff_id
     WHERE d.id = ? AND d.business_id = ?`,
    [id, businessId],
  )
  return res.rows[0] ? mapDeliveryRow(res.rows[0] as Record<string, unknown>) : null
}

export async function createDelivery(data: {
  businessId: string
  orderId: string
  customerId: string
  scheduledDate?: string | null
  scheduledSlot?: string | null
  instructions?: string | null
  assignedStaffId?: string | null
  addressSnapshot: string
  notes?: string | null
  createdBy?: string | null
  branchId?: string | null
}): Promise<string> {
  const id = newId()
  const ts = nowIso()
  await q(
    `INSERT INTO deliveries (id, business_id, branch_id, order_id, customer_id, status, address_snapshot, scheduled_date, scheduled_slot, instructions, assigned_staff_id, notes, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'SCHEDULED', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.businessId,
      data.branchId ?? null,
      data.orderId,
      data.customerId,
      data.addressSnapshot,
      data.scheduledDate ?? null,
      data.scheduledSlot ?? null,
      data.instructions ?? null,
      data.assignedStaffId ?? null,
      data.notes ?? null,
      data.createdBy ?? null,
      ts,
      ts,
    ],
  )
  return id
}

export async function updateDelivery(businessId: string, id: string, data: Partial<Delivery>): Promise<DeliveryRow | null> {
  const existing = await findDelivery(businessId, id)
  if (!existing) return null
  await q(
    `UPDATE deliveries SET
       scheduled_date = ?, scheduled_slot = ?, instructions = ?, assigned_staff_id = ?,
       address_snapshot = ?, notes = ?, updated_at = ?
     WHERE id = ? AND business_id = ?`,
    [
      data.scheduled_date === undefined ? existing.scheduled_date : data.scheduled_date,
      data.scheduled_slot === undefined ? existing.scheduled_slot : data.scheduled_slot,
      data.instructions === undefined ? existing.instructions : data.instructions,
      data.assigned_staff_id === undefined ? existing.assigned_staff_id : data.assigned_staff_id,
      data.address_snapshot ?? existing.address_snapshot,
      data.notes === undefined ? existing.notes : data.notes,
      nowIso(),
      id,
      businessId,
    ],
  )
  return findDelivery(businessId, id)
}

export async function setDeliveryStatus(
  businessId: string,
  id: string,
  data: { status: DeliveryStatus; deliveredAt?: string | null; failedAt?: string | null; failureReason?: string | null; cancelledAt?: string | null; cancelledBy?: string | null },
): Promise<DeliveryRow | null> {
  await q(
    `UPDATE deliveries SET status = ?, delivered_at = ?, failed_at = ?, failure_reason = ?, cancelled_at = ?, cancelled_by = ?, updated_at = ?
     WHERE id = ? AND business_id = ?`,
    [
      data.status,
      data.deliveredAt === undefined ? null : data.deliveredAt,
      data.failedAt === undefined ? null : data.failedAt,
      data.failureReason === undefined ? null : data.failureReason,
      data.cancelledAt === undefined ? null : data.cancelledAt,
      data.cancelledBy === undefined ? null : data.cancelledBy,
      nowIso(),
      id,
      businessId,
    ],
  )
  return findDelivery(businessId, id)
}