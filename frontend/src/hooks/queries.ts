import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query'
import { api } from '../lib/api'
import type {
  Branch,
  BusinessSettings,
  Customer,
  CustomerAddress,
  CustomerListItem,
  CustomerProfile,
  DashboardReport,
  DeliveryRow,
  DeliveryStatus,
  GarmentType,
  LogisticsReport,
  OrderListItem,
  OrderStatus,
  OrderWithRelations,
  Paginated,
  PickupRow,
  PickupStatus,
  RackMapData,
  ReportQuery,
  RevenueReport,
  Service,
  ServicePrice,
  ServicesResponse,
  SettingsBundle,
  StaffUser,
  StorageLocation,
  StorageLocationType,
} from '../types/api'

export const qk = {
  services: (includeInactive = false) => ['services', includeInactive] as const,
  garments: (includeInactive = false) => ['garments', includeInactive] as const,
  pricing: ['pricing'] as const,
  settings: ['settings'] as const,
  staff: (includeInactive = false) => ['staff', includeInactive] as const,
  branches: (includeInactive = false) => ['branches', includeInactive] as const,
  customers: (params: object) => ['customers', params] as const,
  customer: (id: string) => ['customer', id] as const,
  orders: (params: object) => ['orders', params] as const,
  order: (id: string) => ['order', id] as const,
  pickups: (params: object) => ['pickups', params] as const,
  deliveries: (params: object) => ['deliveries', params] as const,
  dashboard: ['reports', 'dashboard'] as const,
  revenue: (params: Record<string, unknown>) => ['reports', 'revenue', params] as const,
  reportPickups: (params: Record<string, unknown>) => ['reports', 'pickups', params] as const,
  reportDeliveries: (params: Record<string, unknown>) => ['reports', 'deliveries', params] as const,
  reportStaff: (params: Record<string, unknown>) => ['reports', 'staff', params] as const,
  storageLocations: (includeInactive = false) => ['storage', 'locations', includeInactive] as const,
  rackMap: ['storage', 'rack-map'] as const,
}

function invalidate(qc: ReturnType<typeof useQueryClient>, keys: readonly unknown[][]) {
  for (const key of keys) void qc.invalidateQueries({ queryKey: key })
}

/* ---------------- reference data ---------------- */

export function useServices(includeInactive = false) {
  return useQuery({
    queryKey: qk.services(includeInactive),
    queryFn: () =>
      api.get<ServicesResponse>('/services', { include_inactive: includeInactive ? 'true' : undefined }),
    staleTime: 5 * 60_000,
  })
}

export function useGarments(includeInactive = false) {
  return useQuery({
    queryKey: qk.garments(includeInactive),
    queryFn: () => api.get<GarmentType[]>('/garments', { include_inactive: includeInactive ? 'true' : undefined }),
    staleTime: 5 * 60_000,
  })
}

export function usePricing() {
  return useQuery({ queryKey: qk.pricing, queryFn: () => api.get<ServicePrice[]>('/pricing'), staleTime: 5 * 60_000 })
}

export function useSettings() {
  return useQuery({ queryKey: qk.settings, queryFn: () => api.get<SettingsBundle>('/settings'), staleTime: 5 * 60_000 })
}

export function useStaff(includeInactive = false) {
  return useQuery({
    queryKey: qk.staff(includeInactive),
    queryFn: () => api.get<StaffUser[]>('/staff', { include_inactive: includeInactive ? 'true' : undefined }),
    staleTime: 60_000,
  })
}

export function useBranches(includeInactive = false) {
  return useQuery({
    queryKey: qk.branches(includeInactive),
    queryFn: () => api.get<Branch[]>('/branches', { include_inactive: includeInactive ? 'true' : undefined }),
    staleTime: 60_000,
  })
}

/* ---------------- customers ---------------- */

export interface CustomerListParams {
  search?: string
  page?: number
  limit?: number
}

export function useCustomers(params: CustomerListParams) {
  return useQuery({
    queryKey: qk.customers(params),
    queryFn: () => api.get<Paginated<CustomerListItem>>('/customers', params as Record<string, string | number>),
    placeholderData: (prev) => prev,
  })
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: qk.customer(id ?? ''),
    queryFn: () => api.get<CustomerProfile>(`/customers/${id}`),
    enabled: Boolean(id),
  })
}

export interface CustomerInput {
  name: string
  phone: { raw: string; country: string }
  email?: string | null
  notes?: string | null
}

export function useCreateCustomer(options?: UseMutationOptions<Customer, Error, CustomerInput>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CustomerInput) => api.post<Customer>('/customers', input),
    onSuccess: () => invalidate(qc, [['customers']]),
    ...options,
  })
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<CustomerInput> & { name?: string; email?: string | null; notes?: string | null }) =>
      api.patch<Customer>(`/customers/${id}`, input),
    onSuccess: () => invalidate(qc, [[...qk.customer(id)], ['customers']]),
  })
}

export interface AddressInput {
  label?: string
  address_line_1: string
  address_line_2?: string | null
  landmark?: string | null
  city?: string | null
  state_region?: string | null
  postal_code?: string | null
  country_code?: string
  is_default?: boolean
}

export function useAddAddress(customerId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AddressInput) => api.post<CustomerAddress>(`/customers/${customerId}/addresses`, input),
    onSuccess: () => invalidate(qc, [[...qk.customer(customerId)]]),
  })
}

export function useUpdateAddress(customerId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ addressId, input }: { addressId: string; input: Partial<AddressInput> }) =>
      api.patch<CustomerAddress>(`/customers/${customerId}/addresses/${addressId}`, input),
    onSuccess: () => invalidate(qc, [[...qk.customer(customerId)]]),
  })
}

export function useDeleteAddress(customerId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (addressId: string) => api.del<{ deleted: boolean }>(`/customers/${customerId}/addresses/${addressId}`),
    onSuccess: () => invalidate(qc, [[...qk.customer(customerId)]]),
  })
}

/* ---------------- orders ---------------- */

export interface OrderListParams {
  search?: string
  status?: string
  payment_status?: string
  payment_method?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
  branch_id?: string
}

export function useOrders(params: OrderListParams) {
  return useQuery({
    queryKey: qk.orders(params),
    queryFn: () => api.get<Paginated<OrderListItem>>('/orders', params as Record<string, string | number>),
    placeholderData: (prev) => prev,
  })
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: qk.order(id ?? ''),
    queryFn: () => api.get<OrderWithRelations>(`/orders/${id}`),
    enabled: Boolean(id),
  })
}

export interface CreateOrderInput {
  customer_id: string
  intake_method: string
  return_method: string
  items: Array<{ garment_type_id: string; service_id: string; quantity: number; notes?: string | null }>
  discount?: { type: string; value_minor?: number; percent_bp?: number }
  advance?: { amount_minor: number; method: string; reference?: string | null; note?: string | null }
  expected_completion_at?: string | null
  notes?: string | null
  client_request_id?: string
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateOrderInput) => api.post<OrderWithRelations>('/orders', input),
    onSuccess: () => invalidate(qc, [['orders'], ['reports'], ['customers']]),
  })
}

export function useChangeOrderStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { status: OrderStatus; force?: boolean; note?: string | null }) =>
      api.post<OrderWithRelations>(`/orders/${id}/status`, input),
    onSuccess: () => invalidate(qc, [[...qk.order(id)], ['orders'], ['reports'], ['customers']]),
  })
}

export function useChangeOrderStatusById() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { orderId: string; status: OrderStatus; force?: boolean; note?: string | null }) =>
      api.post<OrderWithRelations>(`/orders/${input.orderId}/status`, {
        status: input.status,
        ...(input.force !== undefined ? { force: input.force } : {}),
        note: input.note ?? null,
      }),
    onSuccess: (_, vars) => invalidate(qc, [[...qk.order(vars.orderId)], ['orders'], ['reports'], ['customers']]),
  })
}

export function useMarkOrderNotified(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (notified: boolean) => api.post<OrderWithRelations>(`/orders/${id}/notified`, { notified }),
    onSuccess: () => invalidate(qc, [[...qk.order(id)]]),
  })
}

export function useUpdateOrder(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { notes?: string | null; return_method?: string; expected_completion_at?: string | null }) =>
      api.patch<OrderWithRelations>(`/orders/${id}`, input),
    onSuccess: () => invalidate(qc, [[...qk.order(id)], ['orders']]),
  })
}

export interface PaymentInput {
  amount_minor: number
  method: string
  reference?: string | null
  note?: string | null
  client_request_id?: string
}

export function useRecordPayment(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PaymentInput) => api.post<OrderWithRelations>(`/orders/${id}/payments`, input),
    onSuccess: () => invalidate(qc, [[...qk.order(id)], ['orders'], ['reports'], ['customers']]),
  })
}

export function useRecordRefund(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { amount_minor: number; method?: string; note?: string | null }) =>
      api.post<OrderWithRelations>(`/orders/${id}/refunds`, input),
    onSuccess: () => invalidate(qc, [[...qk.order(id)], ['orders'], ['reports'], ['customers']]),
  })
}

/* ---------------- logistics ---------------- */

export interface LogisticsListParams {
  filter?: string
  page?: number
  limit?: number
}

export function usePickups(params: LogisticsListParams) {
  return useQuery({
    queryKey: qk.pickups(params),
    queryFn: () => api.get<Paginated<PickupRow>>('/pickups', params as Record<string, string | number>),
    placeholderData: (prev) => prev,
  })
}

export function useDeliveries(params: LogisticsListParams) {
  return useQuery({
    queryKey: qk.deliveries(params),
    queryFn: () => api.get<Paginated<DeliveryRow>>('/deliveries', params as Record<string, string | number>),
    placeholderData: (prev) => prev,
  })
}

export interface PickupInput {
  customer_id: string
  scheduled_date: string
  scheduled_slot?: string | null
  instructions?: string | null
  assigned_staff_id?: string | null
  address: Record<string, unknown>
  notes?: string | null
}

export function useCreatePickup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PickupInput) => api.post<PickupRow>('/pickups', input),
    onSuccess: () => invalidate(qc, [['pickups'], ['reports'], ['customers']]),
  })
}

export function useChangePickupStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; status: PickupStatus; note?: string | null }) =>
      api.post<PickupRow>(`/pickups/${input.id}/status`, { status: input.status, note: input.note ?? null }),
    onSuccess: () => invalidate(qc, [['pickups'], ['reports'], ['customers']]),
  })
}

export function useUpdatePickup(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => api.patch<PickupRow>(`/pickups/${id}`, input),
    onSuccess: () => invalidate(qc, [['pickups'], ['customers']]),
  })
}

export interface DeliveryInput {
  order_id: string
  scheduled_date?: string | null
  scheduled_slot?: string | null
  instructions?: string | null
  assigned_staff_id?: string | null
  address: Record<string, unknown>
  notes?: string | null
}

export function useCreateDelivery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: DeliveryInput) => api.post<DeliveryRow>('/deliveries', input),
    onSuccess: () => invalidate(qc, [['deliveries'], ['orders'], ['reports'], ['customers']]),
  })
}

export function useChangeDeliveryStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; status: DeliveryStatus; note?: string | null; failure_reason?: string | null }) =>
      api.post<DeliveryRow>(`/deliveries/${input.id}/status`, {
        status: input.status,
        note: input.note ?? null,
        failure_reason: input.failure_reason ?? null,
      }),
    onSuccess: () => invalidate(qc, [['deliveries'], ['orders'], ['reports'], ['customers']]),
  })
}

export function useUpdateDelivery(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => api.patch<DeliveryRow>(`/deliveries/${id}`, input),
    onSuccess: () => invalidate(qc, [['deliveries'], ['customers']]),
  })
}

/* ---------------- reference mutations ---------------- */

export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null; sort_order?: number; is_active?: boolean }) =>
      api.post<Service>('/services', input),
    onSuccess: () => invalidate(qc, [['services']]),
  })
}

export function useUpdateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => api.patch<Service>(`/services/${id}`, input),
    onSuccess: () => invalidate(qc, [['services'], ['pricing']]),
  })
}

export function useCreateGarment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; sort_order?: number; is_active?: boolean }) => api.post<GarmentType>('/garments', input),
    onSuccess: () => invalidate(qc, [['garments'], ['services']]),
  })
}

export function useUpdateGarment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      api.patch<GarmentType>(`/garments/${id}`, input),
    onSuccess: () => invalidate(qc, [['garments'], ['services']]),
  })
}

export function useUpsertPricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entries: Array<{ service_id: string; garment_type_id: string; price_minor: number }>) =>
      api.post<ServicePrice[]>('/pricing', { entries }),
    onSuccess: () => invalidate(qc, [['pricing'], ['services']]),
  })
}

export function useDeletePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ serviceId, garmentTypeId }: { serviceId: string; garmentTypeId: string }) =>
      api.patch<{ deleted: boolean }>(`/pricing/${serviceId}/${garmentTypeId}`),
    onSuccess: () => invalidate(qc, [['pricing'], ['services']]),
  })
}

/* ---------------- settings / staff / branches ---------------- */

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => {
      const { business, settings } = input as { business?: Record<string, unknown>; settings?: Record<string, unknown> }
      return api.patch<{ business: SettingsBundle['business']; settings: BusinessSettings }>('/settings', {
        ...business,
        ...settings,
      })
    },
    onSuccess: () => invalidate(qc, [['settings']]),
  })
}

export function useCreateStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      name: string
      email: string
      password: string
      role: string
      branch_id?: string | null
      phone_e164?: string | null
    }) => api.post<StaffUser>('/staff', input),
    onSuccess: () => invalidate(qc, [['staff']]),
  })
}

export function useUpdateStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => api.patch<StaffUser>(`/staff/${id}`, input),
    onSuccess: () => invalidate(qc, [['staff']]),
  })
}

export function useDeleteStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<{ removed: boolean }>(`/staff/${id}`),
    onSuccess: () => invalidate(qc, [['staff']]),
  })
}

export function useCreateBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; address?: string | null; phone_e164?: string | null }) =>
      api.post<Branch>('/branches', input),
    onSuccess: () => invalidate(qc, [['branches'], ['settings']]),
  })
}

export function useUpdateBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => api.patch<Branch>(`/branches/${id}`, input),
    onSuccess: () => invalidate(qc, [['branches'], ['settings']]),
  })
}

/* ---------------- reports ---------------- */

export function useDashboard() {
  return useQuery({ queryKey: qk.dashboard, queryFn: () => api.get<DashboardReport>('/reports/dashboard'), staleTime: 30_000 })
}

export function useRevenueReport(params: ReportQuery) {
  return useQuery({
    queryKey: qk.revenue(params as Record<string, unknown>),
    queryFn: () => api.get<RevenueReport>('/reports/revenue', params as Record<string, string>),
    placeholderData: (prev) => prev,
  })
}

export function usePickupReport(params: ReportQuery) {
  return useQuery({
    queryKey: qk.reportPickups(params as Record<string, unknown>),
    queryFn: () => api.get<LogisticsReport>('/reports/pickups', params as Record<string, string>),
    placeholderData: (prev) => prev,
  })
}

export function useDeliveryReport(params: ReportQuery) {
  return useQuery({
    queryKey: qk.reportDeliveries(params as Record<string, unknown>),
    queryFn: () => api.get<LogisticsReport>('/reports/deliveries', params as Record<string, string>),
    placeholderData: (prev) => prev,
  })
}

export interface StaffReportRow {
  user_id: string
  user_name: string
  orders_created: number
  total_sales_minor: number
  payments_recorded: number
  payment_amount_minor: number
}

export function useStaffReport(params: ReportQuery) {
  return useQuery({
    queryKey: qk.reportStaff(params as Record<string, unknown>),
    queryFn: () => api.get<StaffReportRow[]>('/reports/staff', params as Record<string, string>),
    placeholderData: (prev) => prev,
  })
}

/* ---------------- storage / rack map ---------------- */

export function useStorageLocations(includeInactive = false) {
  return useQuery({
    queryKey: qk.storageLocations(includeInactive),
    queryFn: () =>
      api.get<StorageLocation[]>('/storage/locations', { include_inactive: includeInactive ? 'true' : undefined }),
    staleTime: 30_000,
  })
}

export interface StorageLocationInput {
  code: string
  label: string
  type?: StorageLocationType
  capacity?: number
  position?: number
}

export function useCreateStorageLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: StorageLocationInput) => api.post<StorageLocation>('/storage/locations', input),
    onSuccess: () => invalidate(qc, [[...qk.storageLocations(true)], [...qk.rackMap]]),
  })
}

export function useUpdateStorageLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<StorageLocationInput> & { is_active?: boolean } }) =>
      api.patch<StorageLocation>(`/storage/locations/${id}`, input),
    onSuccess: () => invalidate(qc, [[...qk.storageLocations(true)], [...qk.rackMap]]),
  })
}

export function useRackMap() {
  return useQuery({
    queryKey: qk.rackMap,
    queryFn: () => api.get<RackMapData>('/storage/rack-map'),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  })
}

export function useAssignOrderToStorage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, storageLocationId }: { orderId: string; storageLocationId: string }) =>
      api.post<OrderWithRelations>(`/orders/${orderId}/storage`, { storage_location_id: storageLocationId }),
    onSuccess: (_, vars) =>
      invalidate(qc, [[...qk.rackMap], [...qk.storageLocations(true)], [...qk.order(vars.orderId)], ['orders']]),
  })
}

export function useReleaseOrderFromStorage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => api.post<OrderWithRelations>(`/orders/${orderId}/storage/release`),
    onSuccess: (_, orderId) =>
      invalidate(qc, [[...qk.rackMap], [...qk.storageLocations(true)], [...qk.order(orderId)], ['orders']]),
  })
}
