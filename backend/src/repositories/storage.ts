import { q } from '../lib/turso'
import { newId, nowIso } from '../utils/helpers'
import type { StorageHistoryEntry, StorageLocation, StorageLocationType } from '../types'

export function mapStorageLocation(row: Record<string, unknown>): StorageLocation {
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    code: String(row.code),
    label: String(row.label),
    type: String(row.type) as StorageLocationType,
    capacity: Number(row.capacity ?? 1),
    position: Number(row.position ?? 0),
    is_active: Number(row.is_active ?? 1),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function listStorageLocations(businessId: string, includeInactive = false): Promise<StorageLocation[]> {
  const res = await q(
    `SELECT * FROM storage_locations WHERE business_id = ? ${includeInactive ? '' : 'AND is_active = 1'} ORDER BY position ASC, code ASC`,
    [businessId],
  )
  return res.rows.map((r) => mapStorageLocation(r as Record<string, unknown>))
}

export async function findStorageLocation(businessId: string, id: string): Promise<StorageLocation | null> {
  const res = await q('SELECT * FROM storage_locations WHERE id = ? AND business_id = ?', [id, businessId])
  return res.rows[0] ? mapStorageLocation(res.rows[0] as Record<string, unknown>) : null
}

export async function createStorageLocation(
  businessId: string,
  data: { code: string; label: string; type?: StorageLocationType; capacity?: number; position?: number },
): Promise<StorageLocation> {
  const id = newId()
  const ts = nowIso()
  await q(
    `INSERT INTO storage_locations (id, business_id, code, label, type, capacity, position, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [id, businessId, data.code, data.label, data.type ?? 'RACK', data.capacity ?? 1, data.position ?? 0, ts, ts],
  )
  return (await findStorageLocation(businessId, id)) as StorageLocation
}

export async function updateStorageLocation(
  businessId: string,
  id: string,
  data: {
    code?: string
    label?: string
    type?: StorageLocationType
    capacity?: number
    position?: number
    is_active?: boolean
  },
): Promise<StorageLocation | null> {
  const existing = await findStorageLocation(businessId, id)
  if (!existing) return null
  await q(
    `UPDATE storage_locations SET code = ?, label = ?, type = ?, capacity = ?, position = ?, is_active = ?, updated_at = ?
     WHERE id = ? AND business_id = ?`,
    [
      data.code ?? existing.code,
      data.label ?? existing.label,
      data.type ?? existing.type,
      data.capacity ?? existing.capacity,
      data.position ?? existing.position,
      data.is_active === undefined ? existing.is_active : data.is_active ? 1 : 0,
      nowIso(),
      id,
      businessId,
    ],
  )
  return findStorageLocation(businessId, id)
}

export async function countActiveAssignments(locationId: string): Promise<number> {
  const res = await q('SELECT COUNT(*) AS n FROM orders WHERE storage_location_id = ? AND storage_released_at IS NULL', [locationId])
  return Number(res.rows[0]?.n ?? 0)
}

export interface OrderStorageState {
  storage_location_id: string | null
  storage_assigned_at: string | null
  storage_released_at: string | null
}

export async function getOrderStorageState(businessId: string, orderId: string): Promise<OrderStorageState | null> {
  const res = await q('SELECT storage_location_id, storage_assigned_at, storage_released_at FROM orders WHERE id = ? AND business_id = ?', [
    orderId,
    businessId,
  ])
  if (!res.rows[0]) return null
  const row = res.rows[0] as Record<string, unknown>
  return {
    storage_location_id: row.storage_location_id ? String(row.storage_location_id) : null,
    storage_assigned_at: row.storage_assigned_at ? String(row.storage_assigned_at) : null,
    storage_released_at: row.storage_released_at ? String(row.storage_released_at) : null,
  }
}

export async function setOrderStorage(
  businessId: string,
  orderId: string,
  locationId: string | null,
  assignedAt: string | null,
  releasedAt: string | null,
): Promise<void> {
  await q(
    `UPDATE orders SET storage_location_id = ?, storage_assigned_at = ?, storage_released_at = ?, updated_at = ?
     WHERE id = ? AND business_id = ?`,
    [locationId, assignedAt, releasedAt, nowIso(), orderId, businessId],
  )
}

export async function insertStorageHistory(entry: {
  businessId: string
  orderId: string
  storageLocationId: string | null
  action: 'ASSIGN' | 'RELEASE'
  createdBy: string | null
}): Promise<void> {
  await q(
    `INSERT INTO storage_history (id, business_id, order_id, storage_location_id, action, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [newId(), entry.businessId, entry.orderId, entry.storageLocationId, entry.action, entry.createdBy, nowIso()],
  )
}

export async function listOrderStorageHistory(businessId: string, orderId: string): Promise<StorageHistoryEntry[]> {
  const res = await q(
    `SELECT * FROM storage_history WHERE order_id = ? AND business_id = ? ORDER BY created_at ASC`,
    [orderId, businessId],
  )
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      business_id: String(row.business_id),
      order_id: String(row.order_id),
      storage_location_id: row.storage_location_id ? String(row.storage_location_id) : null,
      action: String(row.action) as 'ASSIGN' | 'RELEASE',
      created_by: row.created_by ? String(row.created_by) : null,
      created_at: String(row.created_at),
    }
  })
}

export interface StoredItemRow {
  order_id: string
  order_number: string
  status: string
  customer_id: string
  customer_name: string
  customer_phone: string
  item_count: number
  total_minor: number
  amount_paid_minor: number
  balance_minor: number
  storage_assigned_at: string | null
}

const STORED_COLS = `o.id AS order_id, o.order_number, o.status, o.customer_id, c.name AS customer_name,
      c.phone_national AS customer_phone,
      (SELECT COALESCE(SUM(quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
      o.total_minor, o.amount_paid_minor, o.balance_minor, o.storage_assigned_at`

export async function listStoredItemsForLocation(businessId: string, locationId: string): Promise<StoredItemRow[]> {
  const res = await q(
    `SELECT ${STORED_COLS}
     FROM orders o JOIN customers c ON c.id = o.customer_id
     WHERE o.business_id = ? AND o.storage_location_id = ? AND o.storage_released_at IS NULL
     ORDER BY o.storage_assigned_at ASC`,
    [businessId, locationId],
  )
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      order_id: String(row.order_id),
      order_number: String(row.order_number),
      status: String(row.status),
      customer_id: String(row.customer_id),
      customer_name: String(row.customer_name ?? ''),
      customer_phone: String(row.customer_phone ?? ''),
      item_count: Number(row.item_count ?? 0),
      total_minor: Number(row.total_minor ?? 0),
      amount_paid_minor: Number(row.amount_paid_minor ?? 0),
      balance_minor: Number(row.balance_minor ?? 0),
      storage_assigned_at: row.storage_assigned_at ? String(row.storage_assigned_at) : null,
    }
  })
}

export async function listUnstoredReadyOrders(businessId: string): Promise<StoredItemRow[]> {
  const res = await q(
    `SELECT ${STORED_COLS}
     FROM orders o JOIN customers c ON c.id = o.customer_id
     WHERE o.business_id = ? AND o.status = 'READY' AND (o.storage_location_id IS NULL OR o.storage_released_at IS NOT NULL)
     ORDER BY o.ready_at ASC`,
    [businessId],
  )
  return res.rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      order_id: String(row.order_id),
      order_number: String(row.order_number),
      status: String(row.status),
      customer_id: String(row.customer_id),
      customer_name: String(row.customer_name ?? ''),
      customer_phone: String(row.customer_phone ?? ''),
      item_count: Number(row.item_count ?? 0),
      total_minor: Number(row.total_minor ?? 0),
      amount_paid_minor: Number(row.amount_paid_minor ?? 0),
      balance_minor: Number(row.balance_minor ?? 0),
      storage_assigned_at: row.storage_assigned_at ? String(row.storage_assigned_at) : null,
    }
  })
}