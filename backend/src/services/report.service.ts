import { businessToday, dayBoundsUTC, getBusinessContext } from './business.helper'
import {
  getDashboard,
  getRevenueReport,
  getPickupReport,
  getDeliveryReport,
  getStaffActivity,
  getOrdersStats,
} from '../repositories/reports'

export type ReportRange = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom'

export function resolveRange(
  range: ReportRange,
  timezone: string,
  from?: string,
  to?: string,
): { startIso: string; endIso: string; today: string } {
  const today = businessToday(timezone)
  let startDate = today
  let endDate = today
  if (range === 'yesterday') {
    startDate = shiftDays(today, -1)
    endDate = shiftDays(today, -1)
  } else if (range === 'last7') {
    startDate = shiftDays(today, -6)
  } else if (range === 'last30') {
    startDate = shiftDays(today, -29)
  } else if (range === 'custom') {
    if (!from || !to) throw new Error('Custom range requires from and to dates.')
    startDate = from
    endDate = to
  }
  const start = dayBoundsUTC(startDate, timezone).startIso
  const end = dayBoundsUTC(endDate, timezone).endIso
  return { startIso: start, endIso: end, today }
}

function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function dashboard(businessId: string) {
  const ctx = await getBusinessContext(businessId)
  const bounds = dayBoundsUTC(businessToday(ctx.business.timezone), ctx.business.timezone)
  return getDashboard(businessId, {
    startIso: bounds.startIso,
    endIso: bounds.endIso,
    today: businessToday(ctx.business.timezone),
    nowIso: new Date().toISOString(),
  })
}

export async function revenueReport(businessId: string, range: ReportRange, from?: string, to?: string) {
  const ctx = await getBusinessContext(businessId)
  const bounds = resolveRange(range, ctx.business.timezone, from, to)
  return getRevenueReport(businessId, bounds)
}

export async function pickupReport(businessId: string, range: ReportRange, from?: string, to?: string) {
  const ctx = await getBusinessContext(businessId)
  const bounds = resolveRange(range, ctx.business.timezone, from, to)
  return getPickupReport(businessId, bounds)
}

export async function deliveryReport(businessId: string, range: ReportRange, from?: string, to?: string) {
  const ctx = await getBusinessContext(businessId)
  const bounds = resolveRange(range, ctx.business.timezone, from, to)
  return getDeliveryReport(businessId, bounds)
}

export async function staffActivity(businessId: string, range: ReportRange, from?: string, to?: string) {
  const ctx = await getBusinessContext(businessId)
  const bounds = resolveRange(range, ctx.business.timezone, from, to)
  return getStaffActivity(businessId, bounds)
}

export async function ordersStats(businessId: string, range: ReportRange, from?: string, to?: string) {
  const ctx = await getBusinessContext(businessId)
  const bounds = resolveRange(range, ctx.business.timezone, from, to)
  return getOrdersStats(businessId, bounds)
}