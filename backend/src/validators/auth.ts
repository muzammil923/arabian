import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
  businessId: z.string().uuid().optional(),
})

export const passwordSchema = z.string().min(8).max(128).regex(/[A-Za-z]/, 'must contain letters').regex(/[0-9]/, 'must contain a number')

export const staffCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().max(255),
  password: passwordSchema,
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'STAFF']),
  branch_id: z.string().uuid().optional().nullable(),
  phone_e164: z.string().optional().nullable(),
})

export const staffUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'STAFF']).optional(),
  branch_id: z.string().uuid().optional().nullable(),
  phone_e164: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  password: passwordSchema.optional(),
})