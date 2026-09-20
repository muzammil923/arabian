import { q } from '../lib/turso'
import { badRequest, notFound, HttpError } from '../utils/http'
import { newId, nowIso } from '../utils/helpers'
import { findCustomerById } from '../repositories/customers'
import { findOrderById } from '../repositories/orders'
import {
  AddressSnapshot,
  createPickup as repoCreatePickup,
  createDelivery as repoCreateDelivery,
  findPickup,
  findDelivery,
  setPickupStatus as repoSetPickupStatus,
  setDeliveryStatus as repoSetDeliveryStatus,
  snapshotAddress,
  PickupRow,
  DeliveryRow,
} from '../repositories/logistics'
import { insertStatusHistory, updateStatusAndTimestamps } from '../repositories/orders'
import { autoReleaseOrderStorage } from './storage.service'
import type { AuthUser, PickupStatus, DeliveryStatus } from '../types'

const PICKUP_TRANSITIONS: Record<string, PickupStatus[]> = {
  SCHEDULED: ['ASSIGNED', 'OUT_FOR_PICKUP', 'CANCELLED'],
  ASSIGNED: ['OUT_FOR_PICKUP', 'PICKED_UP', 'SCHEDULED', 'CANCELLED'],
  OUT_FOR_PICKUP: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['ARRIVED_AT_STORE'],
  ARRIVED_AT_STORE: [],
  CANCELLED: [],
}

const DELIVERY_TRANSITIONS: Record<string, DeliveryStatus[]> = {
  SCHEDULED: ['ASSIGNED', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  ASSIGNED: ['OUT_FOR_DELIVERY', 'SCHEDULED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED', 'CANCELLED'],
  FAILED: ['SCHEDULED', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

async function ensureStaffBelongsToBusiness(businessId: string, staffId?: string | null): Promise<void> {
  if (!staffId) return
  const res = await q('SELECT 1 FROM business_users WHERE business_id = ? AND user_id = ?', [businessId, staffId])
  if (!res.rows[0]) throw new HttpError(400, 'Assigned staff is not part of this business.', 'INVALID_STAFF')
}

export async function schedulePickup(
  auth: AuthUser,
  data: {
    customer_id: string
    scheduled_date: string
    scheduled_slot?: string | null
    instructions?: string | null
    assigned_staff_id?: string | null
    address: AddressSnapshot
    branch_id?: string | null
    notes?: string | null
  },
): Promise<PickupRow> {
  const customer = await findCustomerById(auth.businessId, data.customer_id)
  if (!customer) throw notFound('Customer not found.')
  await ensureStaffBelongsToBusiness(auth.businessId, data.assigned_staff_id)

  const snapshot = snapshotAddress(data.address)
  const id = await repoCreatePickup({
    businessId: auth.businessId,
    customerId: data.customer_id,
    scheduledDate: data.scheduled_date,
    scheduledSlot: data.scheduled_slot,
    instructions: data.instructions,
    assignedStaffId: data.assigned_staff_id,
    addressSnapshot: snapshot,
    notes: data.notes,
    createdBy: auth.id,
    branchId: data.branch_id,
  })
  await q(
    `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, 'pickup_scheduled', 'pickup', ?, ?, ?)`,
    [newId(), auth.businessId, auth.id, id, JSON.stringify({ scheduled_date: data.scheduled_date }), nowIso()],
  )
  const pickup = await findPickup(auth.businessId, id)
  if (!pickup) throw new Error('Pickup not created.')
  return pickup
}

export async function changePickupStatus(auth: AuthUser, id: string, status: PickupStatus): Promise<PickupRow> {
  const businessId = auth.businessId
  const pickup = await findPickup(businessId, id)
  if (!pickup) throw notFound('Pickup not found.')
  if (status === pickup.status) throw badRequest(`Pickup is already ${status}.`, 'SAME_STATUS')
  const allowed = PICKUP_TRANSITIONS[pickup.status] ?? []
  if (!allowed.includes(status)) {
    throw badRequest(`Cannot change pickup from ${pickup.status} to ${status}.`, 'INVALID_TRANSITION', {
      previous_status: pickup.status,
      requested_status: status,
    })
  }
  const ts = nowIso()
  const updated = await repoSetPickupStatus(businessId, id, {
    status,
    pickedUpAt: status === 'PICKED_UP' ? ts : null,
    arrivedAt: status === 'ARRIVED_AT_STORE' ? ts : null,
    cancelledAt: status === 'CANCELLED' ? ts : null,
    cancelledBy: status === 'CANCELLED' ? auth.id : null,
  })
  await q(
    `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, 'pickup_status_changed', 'pickup', ?, ?, ?)`,
    [newId(), businessId, auth.id, id, JSON.stringify({ previous_status: pickup.status, new_status: status }), ts],
  )
  return (updated as PickupRow) ?? pickup
}

export async function scheduleDelivery(
  auth: AuthUser,
  data: {
    order_id: string
    scheduled_date?: string | null
    scheduled_slot?: string | null
    instructions?: string | null
    assigned_staff_id?: string | null
    address: AddressSnapshot
    branch_id?: string | null
    notes?: string | null
  },
): Promise<DeliveryRow> {
  const order = await findOrderById(auth.businessId, data.order_id)
  if (!order) throw notFound('Order not found.')
  if (order.return_method !== 'HOME_DELIVERY') {
    throw badRequest('This order uses customer pickup, not home delivery.', 'WRONG_RETURN_METHOD')
  }
  if (order.delivery_id) {
    const existing = await findDelivery(auth.businessId, order.delivery_id)
    if (existing && existing.status !== 'CANCELLED' && existing.status !== 'FAILED') {
      throw badRequest('A delivery is already scheduled for this order.', 'DELIVERY_EXISTS')
    }
  }
  await ensureStaffBelongsToBusiness(auth.businessId, data.assigned_staff_id)

  const snapshot = snapshotAddress(data.address)
  const id = await repoCreateDelivery({
    businessId: auth.businessId,
    orderId: data.order_id,
    customerId: order.customer_id,
    scheduledDate: data.scheduled_date,
    scheduledSlot: data.scheduled_slot,
    instructions: data.instructions,
    assignedStaffId: data.assigned_staff_id,
    addressSnapshot: snapshot,
    notes: data.notes,
    createdBy: auth.id,
    branchId: data.branch_id,
  })
  await q(
    `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, 'delivery_scheduled', 'delivery', ?, ?, ?)`,
    [newId(), auth.businessId, auth.id, id, JSON.stringify({ order_id: data.order_id }), nowIso()],
  )
  await q(`UPDATE orders SET delivery_id = ?, updated_at = ? WHERE id = ? AND business_id = ?`, [id, nowIso(), data.order_id, auth.businessId])
  const delivery = await findDelivery(auth.businessId, id)
  if (!delivery) throw new Error('Delivery not created.')
  return delivery
}

export async function changeDeliveryStatus(auth: AuthUser, id: string, status: DeliveryStatus, failureReason?: string | null): Promise<DeliveryRow> {
  const businessId = auth.businessId
  const delivery = await findDelivery(businessId, id)
  if (!delivery) throw notFound('Delivery not found.')
  if (status === delivery.status) throw badRequest(`Delivery is already ${status}.`, 'SAME_STATUS')
  const allowed = DELIVERY_TRANSITIONS[delivery.status] ?? []
  if (!allowed.includes(status)) {
    throw badRequest(`Cannot change delivery from ${delivery.status} to ${status}.`, 'INVALID_TRANSITION', {
      previous_status: delivery.status,
      requested_status: status,
    })
  }
  if (status === 'FAILED' && !failureReason) {
    throw badRequest('A failure reason is required when marking a delivery as failed.', 'FAILURE_REASON_REQUIRED')
  }

  const ts = nowIso()
  const updated = await repoSetDeliveryStatus(businessId, id, {
    status,
    deliveredAt: status === 'DELIVERED' ? ts : null,
    failedAt: status === 'FAILED' ? ts : null,
    failureReason: status === 'FAILED' ? failureReason : null,
    cancelledAt: status === 'CANCELLED' ? ts : null,
    cancelledBy: status === 'CANCELLED' ? auth.id : null,
  })

  // Completing a delivery completes the order as well.
  if (status === 'DELIVERED') {
    const order = await findOrderById(businessId, delivery.order_id)
    if (order && order.status !== 'DELIVERED' && order.status !== 'CANCELLED') {
      await updateStatusAndTimestamps(order.id, { status: 'DELIVERED', ready_at: order.ready_at ?? ts, delivered_at: ts })
      await insertStatusHistory({ businessId, orderId: order.id, previous: order.status, next: 'DELIVERED', changedBy: auth.id, changedAt: ts })
    }
  }

  // Leave the rack when the order goes out for delivery or is delivered.
  if (status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED') {
    await autoReleaseOrderStorage(businessId, delivery.order_id, auth.id)
  }

  await q(
    `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, 'delivery_status_changed', 'delivery', ?, ?, ?)`,
    [newId(), businessId, auth.id, id, JSON.stringify({ previous_status: delivery.status, new_status: status }), ts],
  )
  return (updated as DeliveryRow) ?? delivery
}