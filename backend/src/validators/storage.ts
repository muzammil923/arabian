import { z } from 'zod'

export const storageLocationCreateSchema = z.object({
  code: z.string().trim().min(1).max(20),
  label: z.string().trim().min(1).max(120),
  type: z.enum(['RACK', 'SHELF', 'HANGING', 'LARGE', 'OTHER']).default('RACK'),
  capacity: z.number().int().min(1).max(10000).default(1),
  position: z.number().int().min(0).max(100000).default(0),
})

export const storageLocationPatchSchema = z.object({
  code: z.string().trim().min(1).max(20).optional(),
  label: z.string().trim().min(1).max(120).optional(),
  type: z.enum(['RACK', 'SHELF', 'HANGING', 'LARGE', 'OTHER']).optional(),
  capacity: z.number().int().min(1).max(10000).optional(),
  position: z.number().int().min(0).max(100000).optional(),
  is_active: z.boolean().optional(),
})

export const storageAssignSchema = z.object({
  storage_location_id: z.string().uuid(),
})

export const storageLocationsQuerySchema = z.object({
  include_inactive: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
})