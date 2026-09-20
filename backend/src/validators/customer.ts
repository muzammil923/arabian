import { z } from 'zod'

export const phoneSchema = z.object({
  raw: z.string().trim().min(3).max(32),
  country: z.string().length(2),
})

export const customerCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: phoneSchema,
  email: z.string().email().max(255).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export const customerUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().email().max(255).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

const addressSchema = z.object({
  label: z.string().trim().min(1).max(60).default('Home'),
  address_line_1: z.string().trim().min(1).max(255),
  address_line_2: z.string().trim().max(255).optional().nullable(),
  landmark: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  state_region: z.string().trim().max(120).optional().nullable(),
  postal_code: z.string().trim().max(30).optional().nullable(),
  country_code: z.string().length(2).default('IN'),
  is_default: z.boolean().optional(),
})

export const addressCreateSchema = addressSchema

export const addressUpdateSchema = addressSchema.partial().extend({
  is_default: z.boolean().optional(),
})

export const customerQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})