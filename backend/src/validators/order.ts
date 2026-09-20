import { z } from 'zod'

const orderItemSchema = z.object({
  garment_type_id: z.string().uuid(),
  service_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(10000),
  notes: z.string().max(500).optional().nullable(),
})

const discountSchema = z.object({
  type: z.enum(['NONE', 'FIXED', 'PERCENTAGE']).default('NONE'),
  value_minor: z.number().int().min(0).optional().default(0),
  percent_bp: z.number().int().min(0).max(10000).optional().default(0),
})

export const createOrderSchema = z.object({
  customer_id: z.string().uuid(),
  branch_id: z.string().uuid().optional().nullable(),
  intake_method: z.enum(['STORE_DROPOFF', 'HOME_PICKUP']),
  return_method: z.enum(['CUSTOMER_PICKUP', 'HOME_DELIVERY']),
  pickup_id: z.string().uuid().optional().nullable(),
  items: z.array(orderItemSchema).min(1).max(500),
  discount: discountSchema.optional(),
  advance: z
    .object({
      amount_minor: z.number().int().min(1),
      method: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']),
      reference: z.string().max(120).optional().nullable(),
      note: z.string().max(300).optional().nullable(),
    })
    .optional(),
  expected_completion_at: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  client_request_id: z.string().max(120).optional().nullable(),
})

export const updateOrderSchema = z.object({
  notes: z.string().max(2000).optional().nullable(),
  expected_completion_at: z.string().optional().nullable(),
  return_method: z.enum(['CUSTOMER_PICKUP', 'HOME_DELIVERY']).optional(),
})

export const orderStatusSchema = z.object({
  status: z.enum(['RECEIVED', 'WASHING', 'DRYING', 'IRONING', 'READY', 'DELIVERED', 'CANCELLED']),
  force: z.boolean().optional().default(false),
  note: z.string().max(500).optional().nullable(),
})

export const notifiedSchema = z.object({
  notified: z.boolean().default(true),
})

export const orderQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['RECEIVED', 'WASHING', 'DRYING', 'IRONING', 'READY', 'DELIVERED', 'CANCELLED']).optional(),
  payment_status: z.enum(['UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED']).optional(),
  payment_method: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  branch_id: z.string().uuid().optional(),
  staff_id: z.string().uuid().optional(),
})

export const paymentCreateSchema = z.object({
  amount_minor: z.number().int().min(1),
  method: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']),
  reference: z.string().max(120).optional().nullable(),
  note: z.string().max(300).optional().nullable(),
  client_request_id: z.string().max(120).optional().nullable(),
})

export const refundCreateSchema = z.object({
  amount_minor: z.number().int().min(1),
  method: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']).optional(),
  note: z.string().max(300).optional().nullable(),
})