import { z } from 'zod'

export const serviceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
})

export const garmentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
})

export const servicePatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
})

export const garmentPatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
})

const priceEntrySchema = z.object({
  service_id: z.string().uuid(),
  garment_type_id: z.string().uuid(),
  price_minor: z.number().int().min(0),
})

export const priceBulkSchema = z.object({
  entries: z.array(priceEntrySchema).min(1).max(1000),
})