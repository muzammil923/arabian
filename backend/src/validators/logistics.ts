import { z } from 'zod'

const addressSnapshotSchema = z.object({
  label: z.string().trim().min(1).max(60).default('Home'),
  address_line_1: z.string().trim().min(1).max(255),
  address_line_2: z.string().trim().max(255).optional().nullable(),
  landmark: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  state_region: z.string().trim().max(120).optional().nullable(),
  postal_code: z.string().trim().max(30).optional().nullable(),
  country_code: z.string().length(2).default('IN'),
})

export const pickupCreateSchema = z.object({
  customer_id: z.string().uuid(),
  branch_id: z.string().uuid().optional().nullable(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a valid date (YYYY-MM-DD)'),
  scheduled_slot: z.string().trim().max(60).optional().nullable(),
  instructions: z.string().max(1000).optional().nullable(),
  assigned_staff_id: z.string().uuid().optional().nullable(),
  address: addressSnapshotSchema,
  address_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export const pickupUpdateSchema = z.object({
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduled_slot: z.string().trim().max(60).optional().nullable(),
  instructions: z.string().max(1000).optional().nullable(),
  assigned_staff_id: z.string().uuid().optional().nullable(),
  address: addressSnapshotSchema.optional(),
  notes: z.string().max(1000).optional().nullable(),
})

export const pickupStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'ASSIGNED', 'OUT_FOR_PICKUP', 'PICKED_UP', 'ARRIVED_AT_STORE', 'CANCELLED']),
  note: z.string().max(500).optional().nullable(),
})

export const deliveryCreateSchema = z.object({
  order_id: z.string().uuid(),
  branch_id: z.string().uuid().optional().nullable(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  scheduled_slot: z.string().trim().max(60).optional().nullable(),
  instructions: z.string().max(1000).optional().nullable(),
  assigned_staff_id: z.string().uuid().optional().nullable(),
  address: addressSnapshotSchema,
  notes: z.string().max(1000).optional().nullable(),
})

export const deliveryUpdateSchema = z.object({
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  scheduled_slot: z.string().trim().max(60).optional().nullable(),
  instructions: z.string().max(1000).optional().nullable(),
  assigned_staff_id: z.string().uuid().optional().nullable(),
  address: addressSnapshotSchema.optional(),
  notes: z.string().max(1000).optional().nullable(),
})

export const deliveryStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED']),
  note: z.string().max(500).optional().nullable(),
  failure_reason: z.string().max(500).optional().nullable(),
})

export const logisticsQuerySchema = z.object({
  filter: z.enum(['today', 'upcoming', 'completed', 'cancelled', 'all', 'ready', 'scheduled', 'out', 'delivered', 'failed']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})