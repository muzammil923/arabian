import { getBusiness, getSettings } from '../repositories/settings'
import type { Business, BusinessSettings } from '../types'

export interface BusinessContext {
  business: Business
  settings: BusinessSettings
}

export async function findBusiness(businessId: string): Promise<Business | null> {
  return getBusiness(businessId)
}

export async function getBusinessContext(businessId: string): Promise<BusinessContext> {
  const business = await getBusiness(businessId)
  let settings = await getSettings(businessId)
  if (!business) throw new Error('Business not found.')
  if (!settings) {
    // Safety: always ensure a settings row exists.
    settings = {
      id: business.id,
      business_id: business.id,
      invoice_prefix: 'INV-',
      order_prefix: 'LND-',
      order_number_min_digits: 4,
      receipt_footer: 'Thank you for your business!',
      expected_turnaround_hours: 24,
      pickup_enabled: 1,
      delivery_enabled: 1,
      delivery_charge_minor: 0,
      enable_prepaid_checkout: 1,
      whatsapp_notes: null,
    }
  }
  return { business, settings }
}

/** Today's calendar date (YYYY-MM-DD) in the business timezone. */
export function businessToday(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const map: Record<string, string> = {}
    for (const p of parts) map[p.type] = p.value
    return `${map.year}-${map.month}-${map.day}`
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

/**
 * Returns UTC ISO bounds for a local calendar day in the business timezone.
 */
export function dayBoundsUTC(dateStr: string, timezone: string): { startIso: string; endIso: string } {
  const guess = new Date(`${dateStr}T00:00:00.000Z`)
  let offsetMs = 0
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
    const parts = Object.fromEntries(dtf.formatToParts(guess).map((p) => [p.type, p.value]))
    const localAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    )
    offsetMs = localAsUtc - guess.getTime()
  } catch {
    offsetMs = 0
  }
  const start = guess.getTime() - offsetMs
  const end = start + 24 * 60 * 60 * 1000 - 1
  return { startIso: new Date(start).toISOString(), endIso: new Date(end).toISOString() }
}

export async function addExpectedCompletion(businessId: string, createdIso: string): Promise<string | null> {
  const ctx = await getBusinessContext(businessId)
  const completion = new Date(new Date(createdIso).getTime() + ctx.settings.expected_turnaround_hours * 60 * 60 * 1000)
  return completion.toISOString()
}