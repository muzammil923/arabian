import type {
  DeliveryStatus,
  OrderStatus,
  PickupStatus,
  Role,
} from '../types/api'

export const ROLES: Role[] = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF']

export const ROLE_RANK: Record<Role, number> = { OWNER: 4, ADMIN: 3, MANAGER: 2, STAFF: 1 }

export const ORDER_STATUSES: OrderStatus[] = [
  'RECEIVED',
  'WASHING',
  'DRYING',
  'IRONING',
  'READY',
  'DELIVERED',
  'CANCELLED',
]

export const ORDER_FLOW: OrderStatus[] = ['RECEIVED', 'WASHING', 'DRYING', 'IRONING', 'READY', 'DELIVERED']

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ['WASHING', 'CANCELLED'],
  WASHING: ['DRYING', 'CANCELLED', 'READY', 'DELIVERED'],
  DRYING: ['IRONING', 'CANCELLED', 'READY', 'DELIVERED'],
  IRONING: ['READY', 'CANCELLED', 'DELIVERED'],
  READY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['CANCELLED'],
  CANCELLED: ['RECEIVED'],
}

export const PICKUP_STATUSES: PickupStatus[] = [
  'SCHEDULED',
  'ASSIGNED',
  'OUT_FOR_PICKUP',
  'PICKED_UP',
  'ARRIVED_AT_STORE',
  'CANCELLED',
]

export const PICKUP_TRANSITIONS: Record<PickupStatus, PickupStatus[]> = {
  SCHEDULED: ['ASSIGNED', 'OUT_FOR_PICKUP', 'CANCELLED'],
  ASSIGNED: ['OUT_FOR_PICKUP', 'PICKED_UP', 'SCHEDULED', 'CANCELLED'],
  OUT_FOR_PICKUP: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['ARRIVED_AT_STORE'],
  ARRIVED_AT_STORE: [],
  CANCELLED: [],
}

export const DELIVERY_STATUSES: DeliveryStatus[] = [
  'SCHEDULED',
  'ASSIGNED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
]

export const DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  SCHEDULED: ['ASSIGNED', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  ASSIGNED: ['OUT_FOR_DELIVERY', 'SCHEDULED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED', 'CANCELLED'],
  FAILED: ['SCHEDULED', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

export const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER'] as const

export const STORAGE_LOCATION_TYPES = ['RACK', 'SHELF', 'HANGING', 'LARGE', 'OTHER'] as const

export const STORAGE_LOCATION_TYPE_LABELS: Record<string, string> = {
  RACK: 'Rack',
  SHELF: 'Shelf',
  HANGING: 'Hanging rail',
  LARGE: 'Large item',
  OTHER: 'Other',
}

export const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  WASHING: 'Washing',
  DRYING: 'Drying',
  IRONING: 'Ironing',
  READY: 'Ready',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  SCHEDULED: 'Scheduled',
  ASSIGNED: 'Assigned',
  OUT_FOR_PICKUP: 'Out for pickup',
  OUT_FOR_DELIVERY: 'Out for delivery',
  PICKED_UP: 'Picked up',
  ARRIVED_AT_STORE: 'Arrived at store',
  FAILED: 'Failed',
  UNPAID: 'Unpaid',
  PARTIALLY_PAID: 'Partial',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
}

export const STATUS_TONES: Record<string, string> = {
  RECEIVED: 'bg-sky-100 text-sky-700 ring-sky-600/20',
  WASHING: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  DRYING: 'bg-indigo-100 text-indigo-700 ring-indigo-600/20',
  IRONING: 'bg-violet-100 text-violet-700 ring-violet-600/20',
  READY: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  DELIVERED: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  CANCELLED: 'bg-slate-200 text-slate-600 ring-slate-500/20',
  SCHEDULED: 'bg-sky-100 text-sky-700 ring-sky-600/20',
  ASSIGNED: 'bg-indigo-100 text-indigo-700 ring-indigo-600/20',
  OUT_FOR_PICKUP: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  OUT_FOR_DELIVERY: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  PICKED_UP: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  ARRIVED_AT_STORE: 'bg-teal-100 text-teal-700 ring-teal-600/20',
  FAILED: 'bg-rose-100 text-rose-700 ring-rose-600/20',
  UNPAID: 'bg-rose-100 text-rose-700 ring-rose-600/20',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  PAID: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  REFUNDED: 'bg-slate-200 text-slate-600 ring-slate-500/20',
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  return STATUS_LABELS[status] ?? status
}

export function statusTone(status: string | null | undefined): string {
  if (!status) return 'bg-slate-100 text-slate-600 ring-slate-500/20'
  return STATUS_TONES[status] ?? 'bg-slate-100 text-slate-600 ring-slate-500/20'
}

export const INTAKE_LABELS: Record<string, string> = {
  STORE_DROPOFF: 'Store drop-off',
  HOME_PICKUP: 'Home pickup',
}

export const RETURN_LABELS: Record<string, string> = {
  CUSTOMER_PICKUP: 'Customer pickup',
  HOME_DELIVERY: 'Home delivery',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank transfer',
  OTHER: 'Other',
}

export const REPORT_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom' },
] as const

export function canApplyDiscount(role: Role | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER'
}

export function isManager(role: Role | undefined): boolean {
  return ROLE_RANK[role ?? 'STAFF'] >= ROLE_RANK.MANAGER
}

export function isAdmin(role: Role | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}
