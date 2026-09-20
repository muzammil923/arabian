export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF'

export const ROLES: Role[] = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF']

export const ROLE_RANK: Record<Role, number> = { OWNER: 4, ADMIN: 3, MANAGER: 2, STAFF: 1 }

export type OrderStatus =
  | 'RECEIVED'
  | 'WASHING'
  | 'DRYING'
  | 'IRONING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED'

export const ORDER_STATUSES: OrderStatus[] = [
  'RECEIVED',
  'WASHING',
  'DRYING',
  'IRONING',
  'READY',
  'DELIVERED',
  'CANCELLED',
]

export const ORDER_STATUS_STEPS: Record<OrderStatus, number> = {
  RECEIVED: 0,
  WASHING: 1,
  DRYING: 2,
  IRONING: 3,
  READY: 4,
  DELIVERED: 5,
  CANCELLED: -1,
}

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED'

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER'

export const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']

export type PaymentType = 'PAYMENT' | 'REFUND'

export type IntakeMethod = 'STORE_DROPOFF' | 'HOME_PICKUP'

export type ReturnMethod = 'CUSTOMER_PICKUP' | 'HOME_DELIVERY'

export type DiscountType = 'NONE' | 'FIXED' | 'PERCENTAGE'

export type PickupStatus =
  | 'SCHEDULED'
  | 'ASSIGNED'
  | 'OUT_FOR_PICKUP'
  | 'PICKED_UP'
  | 'ARRIVED_AT_STORE'
  | 'CANCELLED'

export type DeliveryStatus =
  | 'SCHEDULED'
  | 'ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  businessId: string
  branchId: string | null
}

export interface Customer {
  id: string
  business_id: string
  name: string
  phone_country: string
  phone_country_code: string
  phone_national: string
  phone_e164: string
  email: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CustomerAddress {
  id: string
  business_id: string
  customer_id: string
  label: string
  address_line_1: string
  address_line_2: string | null
  landmark: string | null
  city: string | null
  state_region: string | null
  postal_code: string | null
  country_code: string
  is_default: number
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  business_id: string
  name: string
  description: string | null
  sort_order: number
  is_active: number
  created_at: string
  updated_at: string
}

export interface GarmentType {
  id: string
  business_id: string
  name: string
  sort_order: number
  is_active: number
  created_at: string
  updated_at: string
}

export interface ServicePrice {
  id: string
  business_id: string
  service_id: string
  garment_type_id: string
  price_minor: number
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  business_id: string
  garment_type_id: string
  service_id: string
  quantity: number
  unit_price_minor: number
  line_total_minor: number
  notes: string | null
  created_at?: string
}

export interface Payment {
  id: string
  business_id: string
  order_id: string
  type: 'PAYMENT' | 'REFUND'
  amount_minor: number
  method: PaymentMethod
  reference: string | null
  note: string | null
  recorded_by: string | null
  recorded_at: string
  created_at: string
}

export type StorageLocationType = 'RACK' | 'SHELF' | 'HANGING' | 'LARGE' | 'OTHER'

export const STORAGE_LOCATION_TYPES: StorageLocationType[] = ['RACK', 'SHELF', 'HANGING', 'LARGE', 'OTHER']

export interface StorageLocation {
  id: string
  business_id: string
  code: string
  label: string
  type: StorageLocationType
  capacity: number
  position: number
  is_active: number
  created_at: string
  updated_at: string
}

export interface StorageHistoryEntry {
  id: string
  business_id: string
  order_id: string
  storage_location_id: string | null
  action: 'ASSIGN' | 'RELEASE'
  created_by: string | null
  created_at: string
}

export interface Order {
  id: string
  business_id: string
  branch_id: string | null
  order_number: string
  customer_id: string
  status: OrderStatus
  payment_status: PaymentStatus
  intake_method: IntakeMethod
  return_method: ReturnMethod
  pickup_id: string | null
  delivery_id: string | null
  discount_type: DiscountType
  discount_value_minor: number
  discount_percent_bp: number
  subtotal_minor: number
  discount_minor: number
  tax_minor: number
  total_minor: number
  amount_paid_minor: number
  balance_minor: number
  expected_completion_at: string | null
  ready_at: string | null
  delivered_at: string | null
  customer_notified_at: string | null
  customer_notified_by: string | null
  storage_location_id: string | null
  storage_assigned_at: string | null
  storage_released_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Pickup {
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
}

export interface Delivery {
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
}

export interface BusinessSettings {
  id: string
  business_id: string
  invoice_prefix: string
  order_prefix: string
  order_number_min_digits: number
  receipt_footer: string
  expected_turnaround_hours: number
  pickup_enabled: number
  delivery_enabled: number
  delivery_charge_minor: number
  enable_prepaid_checkout: number
  whatsapp_notes: string | null
}

export interface Business {
  id: string
  name: string
  logo_url: string | null
  address: string | null
  phone_e164: string | null
  country_code: string
  currency: string
  currency_symbol: string
  timezone: string
  default_calling_country: string
  language: string
  tax_name: string
  tax_bp: number
  is_active: number
  created_at: string
  updated_at: string
}

export interface Branch {
  id: string
  business_id: string
  name: string
  address: string | null
  phone_e164: string | null
  is_active: number
  created_at: string
  updated_at: string
}

export interface StaffUser {
  business_user_id: string
  user_id: string
  email: string
  name: string
  role: Role
  phone_e164: string | null
  is_active: number
  created_at: string
}

export interface AuditLog {
  id: string
  business_id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: string | null
  created_at: string
}

export interface SchemaColumnish {
  [key: string]: unknown
}

export type OrderWithRelations = Order & {
  customer?: Customer
  items?: Array<OrderItem & { garment_name?: string; service_name?: string }>
  payments?: Payment[]
  status_history?: Array<{ previous_status: string; new_status: string; changed_by_name: string | null; changed_at: string }>
  pickup?: Pickup | null
  delivery?: Delivery | null
  created_by_name?: string | null
}