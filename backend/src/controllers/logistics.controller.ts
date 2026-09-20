import { Request, Response } from 'express'
import { asyncHandler } from '../utils/http'
import { listPickups, findPickup, listDeliveries, findDelivery, updatePickup as repoUpdatePickup, updateDelivery as repoUpdateDelivery } from '../repositories/logistics'
import { changeDeliveryStatus, changePickupStatus, scheduleDelivery, schedulePickup } from '../services/logistics.service'
import { getBusinessContext, businessToday } from '../services/business.helper'

export const pickupList = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const ctx = await getBusinessContext(auth.businessId)
  const today = businessToday(ctx.business.timezone)
  const result = await listPickups(auth.businessId, { ...req.query, today } as never)
  res.json({ data: result })
})

export const pickupCreate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const pickup = await schedulePickup(auth, req.body)
  res.status(201).json({ data: pickup })
})

export const pickupDetail = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const pickup = await findPickup(auth.businessId, req.params.id)
  if (!pickup) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pickup not found.' } })
    return
  }
  res.json({ data: pickup })
})

export const pickupUpdate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const { address, ...rest } = req.body
  const addr = address ? JSON.stringify(address) : undefined
  const updated = await repoUpdatePickup(auth.businessId, req.params.id, {
    ...rest,
    address_snapshot: addr,
  } as never)
  if (!updated) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pickup not found.' } })
    return
  }
  res.json({ data: updated })
})

export const pickupStatus = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const pickup = await changePickupStatus(auth, req.params.id, req.body.status)
  res.json({ data: pickup })
})

export const deliveryList = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const ctx = await getBusinessContext(auth.businessId)
  const today = businessToday(ctx.business.timezone)
  const result = await listDeliveries(auth.businessId, { ...req.query, today } as never)
  res.json({ data: result })
})

export const deliveryCreate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const delivery = await scheduleDelivery(auth, req.body)
  res.status(201).json({ data: delivery })
})

export const deliveryDetail = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const delivery = await findDelivery(auth.businessId, req.params.id)
  if (!delivery) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Delivery not found.' } })
    return
  }
  res.json({ data: delivery })
})

export const deliveryUpdate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const { address, ...rest } = req.body
  const addr = address ? JSON.stringify(address) : undefined
  const updated = await repoUpdateDelivery(auth.businessId, req.params.id, {
    ...rest,
    address_snapshot: addr,
  } as never)
  if (!updated) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Delivery not found.' } })
    return
  }
  res.json({ data: updated })
})

export const deliveryStatus = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const delivery = await changeDeliveryStatus(auth, req.params.id, req.body.status, req.body.failure_reason)
  res.json({ data: delivery })
})