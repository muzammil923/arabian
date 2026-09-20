import { z } from 'zod'

export const businessSettingsSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  logo_url: z.string().url().max(500).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone_e164: z.string().optional().nullable(),
  country_code: z.string().length(2).optional(),
  currency: z.string().length(3).optional(),
  currency_symbol: z.string().max(10).optional(),
  timezone: z.string().max(80).optional(),
  default_calling_country: z.string().length(2).optional(),
  language: z.string().max(10).optional(),
  tax_name: z.string().max(60).optional(),
  tax_bp: z.number().int().min(0).max(10000).optional(),
  invoice_prefix: z.string().max(20).optional(),
  order_prefix: z.string().max(20).optional(),
  order_number_min_digits: z.number().int().min(1).max(8).optional(),
  receipt_footer: z.string().max(300).optional(),
  expected_turnaround_hours: z.number().int().min(1).max(24 * 30).optional(),
  pickup_enabled: z.boolean().optional(),
  delivery_enabled: z.boolean().optional(),
  delivery_charge_minor: z.number().int().min(0).optional(),
  enable_prepaid_checkout: z.boolean().optional(),
  whatsapp_notes: z.string().max(500).optional().nullable(),
})

export const branchCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  address: z.string().max(500).optional().nullable(),
  phone_e164: z.string().optional().nullable(),
})

export const branchPatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  address: z.string().max(500).optional().nullable(),
  phone_e164: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
})

export const reportQuerySchema = z.object({
  range: z.enum(['today', 'yesterday', 'last7', 'last30', 'custom']).default('today'),
  from: z.string().optional(),
  to: z.string().optional(),
  branch_id: z.string().uuid().optional(),
})