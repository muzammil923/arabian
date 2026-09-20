import { badRequest, conflict, notFound } from '../utils/http'
import { findOrderById } from '../repositories/orders'
import {
  countActiveAssignments,
  createStorageLocation as repoCreateStorageLocation,
  findStorageLocation,
  getOrderStorageState,
  insertStorageHistory,
  listOrderStorageHistory,
  listStorageLocations,
  listStoredItemsForLocation,
  listUnstoredReadyOrders,
  setOrderStorage,
  updateStorageLocation as repoUpdateStorageLocation,
} from '../repositories/storage'
import { nowIso, writeAuditLog } from '../utils/helpers'
import type { AuthUser, StorageHistoryEntry, StorageLocation, StorageLocationType, Order } from '../types'

export type { StorageLocationType }

function sameBusinessCode(locations: StorageLocation[], code: string, excludeId?: string): boolean {
  const normalized = code.trim().toUpperCase()
  return locations.some((l) => l.code.trim().toUpperCase() === normalized && l.id !== excludeId)
}

export async function listLocations(businessId: string, includeInactive = false): Promise<StorageLocation[]> {
  return listStorageLocations(businessId, includeInactive)
}

export async function createLocation(auth: AuthUser, data: { code: string; label: string; type?: StorageLocationType; capacity?: number; position?: number }): Promise<StorageLocation> {
  const existing = await listStorageLocations(auth.businessId, true)
  if (sameBusinessCode(existing, data.code)) {
    throw conflict(`Storage location "${data.code}" already exists.`, 'DUPLICATE_CODE')
  }
  const location = await repoCreateStorageLocation(auth.businessId, data)
  await writeAuditLog({
    businessId: auth.businessId,
    userId: auth.id,
    action: 'storage_location_created',
    entityType: 'storage_location',
    entityId: location.id,
    metadata: { code: location.code, label: location.label, type: location.type },
  })
  return location
}

export async function updateLocation(
  auth: AuthUser,
  id: string,
  data: { code?: string; label?: string; type?: StorageLocationType; capacity?: number; position?: number; is_active?: boolean },
): Promise<StorageLocation> {
  if (data.code) {
    const existing = await listStorageLocations(auth.businessId, true)
    if (sameBusinessCode(existing, data.code, id)) {
      throw conflict(`Storage location "${data.code}" already exists.`, 'DUPLICATE_CODE')
    }
  }
  const updated = await repoUpdateStorageLocation(auth.businessId, id, data)
  if (!updated) throw notFound('Storage location not found.')
  await writeAuditLog({
    businessId: auth.businessId,
    userId: auth.id,
    action: data.is_active === false ? 'storage_location_disabled' : 'storage_location_updated',
    entityType: 'storage_location',
    entityId: id,
    metadata: { changed: data },
  })
  return updated
}

export interface RackMapLocation extends StorageLocation {
  occupied: number
  items: any[]
}

export async function getRackMap(auth: AuthUser) {
  const businessId = auth.businessId
  const locations = await listStorageLocations(businessId, false)
  const overview: RackMapLocation[] = []
  for (const location of locations) {
    const items = await listStoredItemsForLocation(businessId, location.id)
    overview.push({ ...location, occupied: items.length, items })
  }
  const unstored = await listUnstoredReadyOrders(businessId)
  return { locations: overview, unstored }
}

export async function assignOrderToStorage(auth: AuthUser, orderId: string, storageLocationId: string): Promise<Order> {
  const businessId = auth.businessId
  const order = await findOrderById(businessId, orderId)
  if (!order) throw notFound('Order not found.')
  if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
    throw badRequest(`Cannot assign storage to a ${order.status === 'DELIVERED' ? 'delivered' : 'cancelled'} order.`, 'BAD_ORDER_STATUS')
  }

  const location = await findStorageLocation(businessId, storageLocationId)
  if (!location) throw notFound('Storage location not found.')
  if (location.is_active === 0) throw badRequest(`Storage location "${location.code}" is disabled.`, 'LOCATION_DISABLED')

  const state = await getOrderStorageState(businessId, orderId)
  if (state && state.storage_location_id === storageLocationId && state.storage_released_at === null) {
    throw conflict('Order is already stored at this location.', 'ALREADY_ASSIGNED')
  }

  const occupied = await countActiveAssignments(storageLocationId)
  if (occupied >= location.capacity) {
    throw conflict(`Storage location "${location.code}" is full (${location.capacity}).`, 'LOCATION_FULL', {
      capacity: location.capacity,
      occupied,
    })
  }

  const ts = nowIso()

  // Reassigning from another active location: release it first, keeping history.
  if (state && state.storage_location_id && state.storage_location_id !== storageLocationId && state.storage_released_at === null) {
    await setOrderStorage(businessId, orderId, storageLocationId, ts, null)
    await insertStorageHistory({ businessId, orderId, storageLocationId: state.storage_location_id, action: 'RELEASE', createdBy: auth.id })
    await insertStorageHistory({ businessId, orderId, storageLocationId, action: 'ASSIGN', createdBy: auth.id })
  } else {
    await setOrderStorage(businessId, orderId, storageLocationId, ts, null)
    await insertStorageHistory({ businessId, orderId, storageLocationId, action: 'ASSIGN', createdBy: auth.id })
  }

  await writeAuditLog({
    businessId,
    userId: auth.id,
    action: 'order_storage_assigned',
    entityType: 'order',
    entityId: orderId,
    metadata: { storage_location_id: storageLocationId, storage_code: location.code },
  })

  return (await findOrderById(businessId, orderId)) as Order
}

export async function releaseOrderFromStorage(auth: AuthUser, orderId: string): Promise<Order> {
  const order = await releaseOrderStorageInternal(auth.businessId, orderId, auth.id)
  return order
}

/** Idempotent internal release used by order/delivery workflows. */
export async function autoReleaseOrderStorage(businessId: string, orderId: string, actorId: string | null = null): Promise<void> {
  await releaseOrderStorageInternal(businessId, orderId, actorId)
}

async function releaseOrderStorageInternal(businessId: string, orderId: string, actorId: string | null): Promise<Order> {
  const order = await findOrderById(businessId, orderId)
  if (!order) throw notFound('Order not found.')
  const state = await getOrderStorageState(businessId, orderId)
  if (!state || !state.storage_location_id || state.storage_released_at !== null) {
    return order
  }
  const ts = nowIso()
  const location = await findStorageLocation(businessId, state.storage_location_id)
  await setOrderStorage(businessId, orderId, state.storage_location_id, state.storage_assigned_at, ts)
  await insertStorageHistory({ businessId, orderId, storageLocationId: state.storage_location_id, action: 'RELEASE', createdBy: actorId })
  await writeAuditLog({
    businessId,
    userId: actorId,
    action: 'order_storage_released',
    entityType: 'order',
    entityId: orderId,
    metadata: { storage_location_id: state.storage_location_id, storage_code: location?.code ?? null },
  })
  return (await findOrderById(businessId, orderId)) as Order
}

export async function getOrderStorageHistory(businessId: string, orderId: string): Promise<StorageHistoryEntry[]> {
  const order = await findOrderById(businessId, orderId)
  if (!order) throw notFound('Order not found.')
  return listOrderStorageHistory(businessId, orderId)
}