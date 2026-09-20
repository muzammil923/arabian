import { Request, Response } from 'express'
import { asyncHandler } from '../utils/http'
import {
  addGarment,
  addService,
  getAllGarments,
  getAllPrices,
  getAllServices,
  patchGarment,
  patchService,
  removePrice,
  setPrices,
} from '../services/reference.service'

export const serviceList = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const includeInactive = req.query.include_inactive === 'true'
  res.json({
    data: {
      services: await getAllServices(auth.businessId, includeInactive),
      garment_types: await getAllGarments(auth.businessId, includeInactive),
    },
  })
})

export const serviceCreate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const service = await addService(auth, req.body)
  res.status(201).json({ data: service })
})

export const servicePatch = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const service = await patchService(auth, req.params.id, req.body)
  res.json({ data: service })
})

export const garmentList = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const includeInactive = req.query.include_inactive === 'true'
  res.json({ data: await getAllGarments(auth.businessId, includeInactive) })
})

export const garmentCreate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const garment = await addGarment(auth, req.body)
  res.status(201).json({ data: garment })
})

export const garmentPatch = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const garment = await patchGarment(auth, req.params.id, req.body)
  res.json({ data: garment })
})

export const priceList = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  res.json({ data: await getAllPrices(auth.businessId) })
})

export const priceUpdate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const prices = await setPrices(auth, req.body.entries)
  res.json({ data: prices })
})

export const priceDelete = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  await removePrice(auth, req.params.serviceId, req.params.garmentTypeId)
  res.json({ data: { deleted: true } })
})