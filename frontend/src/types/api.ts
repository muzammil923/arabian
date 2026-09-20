export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF'

export type OrderStatus =
  | 'RECEIVED'
  | 'WASHING'
  | 'DRYING'
  | 'IRONING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED'

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED'

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER'

export type PaymentType = 'PAYMENT' | 'REFUND'

export type IntakeMethod = 'STORE_DROPOFF' | 'HOME_PICKUP'

export type ReturnMethod = 'CUSTOMER_PICKUP' | 'HOME_DELIVERY'

export type StorageLocationType = 'RACK' | 'SHELF' | 'HANGING' | 'LARGE' | 'OTHER'

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

export interface ApiEnvelope<T> {
  data: T
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface Paginated<T> {
  rows: T[]
  total: number
}

export interface AuthUser {
  id: string
  name: string
  email: string
}

export interface LoginResult {
  user: AuthUser
  businessId: string
  role: Role
  branchId: string | null
  businesses: Array<{ id: string; name: string; role: Role }>
}

export interface MeResult {
  user: AuthUser
  businessId: string
  role: Role
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

export interface CustomerListItem extends Customer {
  total_orders: number
  outstanding_minor: number
  last_order_at: string | null
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

export interface AddressSnapshot {
  label?: string
  address_line_1: string
  address_line_2?: string | null
  landmark?: string | null
  city?: string | null
  state_region?: string | null
  postal_code?: string | null
  country_code?: string
}

export interface CustomerSummary {
  total_orders: number
  total_spending_minor: number
  outstanding_minor: number
  last_visit: string | null
}

export interface CustomerOrderRef {
  id: string
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  total_minor: number
  amount_paid_minor: number
  balance_minor: number
  created_at: string
  expected_completion_at: string | null
}

export interface CustomerPaymentRef {
  id: string
  amount_minor: number
  method: PaymentMethod
  type: PaymentType
  recorded_at: string
  note: string | null
  order_number: string
}

export interface CustomerLogisticsRef {
  id: string
  status: string
  scheduled_date: string | null
  scheduled_slot: string | null
  address_snapshot: string
  created_at: string
}

export interface CustomerProfile {
  customer: Customer
  summary: CustomerSummary
  addresses: CustomerAddress[]
  orders: CustomerOrderRef[]
  payments: CustomerPaymentRef[]
  pickups: CustomerLogisticsRef[]
  deliveries: CustomerLogisticsRef[]
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

export interface ServiceWithPrices extends Service {
  prices: ServicePrice[]
}

export interface ServicesResponse {
  services: ServiceWithPrices[]
  garment_types: GarmentType[]
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
  garment_name?: string
  service_name?: string
}

export interface Payment {
  id: string
  business_id: string
  order_id: string
  type: PaymentType
  amount_minor: number
  method: PaymentMethod
  reference: string | null
  note: string | null
  recorded_by: string | null
  recorded_by_name?: string | null
  recorded_at: string
  created_at: string
}

export interface StatusHistoryEntry {
  previous_status: string
  new_status: string
  changed_at: string
  changed_by_name: string | null
}

export interface OrderListItem {
  id: string
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  intake_method: IntakeMethod
  return_method: ReturnMethod
  total_minor: number
  amount_paid_minor: number
  balance_minor: number
  expected_completion_at: string | null
  created_at: string
  updated_at: string
  customer_id: string
  customer_name: string
  customer_phone: string
  customer_national: string
  branch_name: string | null
  item_count: number
  storage_location_id: string | null
  storage_assigned_at: string | null
  storage_released_at: string | null
}

export interface OrderWithRelations {
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
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  storage_location_id: string | null
  storage_assigned_at: string | null
  storage_released_at: string | null
  customer?: Customer
  items?: OrderItem[]
  payments?: Payment[]
  status_history?: StatusHistoryEntry[]
  pickup?: PickupRow | null
  delivery?: DeliveryRow | null
  created_by_name?: string | null
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

export interface StoredItem {
  order_id: string
  order_number: string
  status: OrderStatus
  customer_id: string
  customer_name: string
  customer_phone: string
  item_count: number
  total_minor: number
  amount_paid_minor: number
  balance_minor: number
  storage_assigned_at: string | null
}

export interface RackMapLocation extends StorageLocation {
  occupied: number
  items: StoredItem[]
}

export interface RackMapData {
  locations: RackMapLocation[]
  unstored: StoredItem[]
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

export interface SettingsBundle {
  business: Business
  settings: BusinessSettings
  branches: Branch[]
}

export interface DashboardReport {
  today: {
    revenue_orders_minor: number
    revenue_payments_minor: number
    orders_count: number
    ready_count: number
    outstanding_minor: number
    pickups_count: number
    deliveries_count: number
  }
  status_overview: Array<{ status: string; count: number }>
  payment_status_overview: Array<{ payment_status: string; count: number }>
  recent_orders: Array<{
    id: string
    order_number: string
    customer_name: string
    status: string
    payment_status: string
    total_minor: number
    balance_minor: number
    created_at: string
  }>
  next_pickups: Array<{
    id: string
    customer_name: string
    scheduled_date: string
    scheduled_slot: string | null
    status: string
  }>
  next_deliveries: Array<{
    id: string
    order_number: string
    customer_name: string
    scheduled_date: string | null
    scheduled_slot: string | null
    status: string
  }>
  outstanding: Array<{
    id: string
    order_number: string
    customer_name: string
    balance_minor: number
    created_at: string
  }>
  attention: Array<{
    id: string
    order_number: string
    customer_name: string
    status: string
    expected_completion_at: string | null
  }>
}

export interface RevenueReport {
  summary: {
    total_revenue_minor: number
    total_payments_minor: number
    paid_orders: number
    total_orders: number
    outstanding_minor: number
  }
  series: Array<{ date: string; revenue_minor: number; orders: number }>
  payment_breakdown: Array<{ method: string; amount_minor: number; count: number }>
  branch_breakdown: Array<{
    branch_id: string | null
    branch_name: string
    revenue_minor: number
    orders: number
  }>
  service_breakdown: Array<{
    service_id: string
    service_name: string
    revenue_minor: number
    quantity: number
  }>
  garment_breakdown: Array<{
    garment_type_id: string
    garment_type_name: string
    quantity: number
    revenue_minor: number
  }>
}

export type ReportRange = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom'

export interface ReportQuery {
  range?: ReportRange
  from?: string
  to?: string
}

export interface LogisticsReport {
  pickup_breakdown?: Array<{ status: string; count: number }>
  delivery_breakdown?: Array<{ status: string; count: number }>
  total: number
  today_count: number
}
