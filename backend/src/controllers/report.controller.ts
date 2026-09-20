import { Request, Response } from 'express'
import { asyncHandler } from '../utils/http'
import { dashboard, deliveryReport, ordersStats, pickupReport, revenueReport, staffActivity } from '../services/report.service'
import { ReportRange } from '../services/report.service'

export const reportDashboard = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  res.json({ data: await dashboard(auth.businessId) })
})

export const reportRevenue = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const q = req.query as { range?: string; from?: string; to?: string }
  const data = await revenueReport(auth.businessId, (q.range ?? 'today') as ReportRange, q.from, q.to)
  res.json({ data })
})

export const reportPayments = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const q = req.query as { range?: string; from?: string; to?: string }
  const data = await revenueReport(auth.businessId, (q.range ?? 'today') as ReportRange, q.from, q.to)
  res.json({ data: data.payment_breakdown })
})

export const reportPickups = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const q = req.query as { range?: string; from?: string; to?: string }
  res.json({ data: await pickupReport(auth.businessId, (q.range ?? 'today') as ReportRange, q.from, q.to) })
})

export const reportDeliveries = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const q = req.query as { range?: string; from?: string; to?: string }
  res.json({ data: await deliveryReport(auth.businessId, (q.range ?? 'today') as ReportRange, q.from, q.to) })
})

export const reportStaff = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const q = req.query as { range?: string; from?: string; to?: string }
  res.json({ data: await staffActivity(auth.businessId, (q.range ?? 'today') as ReportRange, q.from, q.to) })
})

export const reportOrders = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const q = req.query as { range?: string; from?: string; to?: string }
  res.json({ data: await ordersStats(auth.businessId, (q.range ?? 'today') as ReportRange, q.from, q.to) })
})