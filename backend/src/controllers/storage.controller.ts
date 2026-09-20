import { Request, Response } from 'express'
import { asyncHandler } from '../utils/http'
import {
  assignOrderToStorage,
  createLocation,
  getOrderStorageHistory,
  getRackMap,
  listLocations,
  releaseOrderFromStorage,
  updateLocation,
} from '../services/storage.service'
import { findOrderWithRelations } from '../repositories/orders'

export const storageLocationsList = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const includeInactive = (req.query as { include_inactive?: boolean }).include_inactive === true
  const locations = await listLocations(auth.businessId, includeInactive)
  res.json({ data: { locations } })
})

export const storageLocationCreate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const location = await createLocation(auth, req.body)
  res.status(201).json({ data: location })
})

export const storageLocationPatch = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const location = await updateLocation(auth, req.params.id, req.body)
  res.json({ data: location })
})

export const rackMapGet = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const data = await getRackMap(auth)
  res.json({ data })
})

export const orderStorageAssign = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const order = await assignOrderToStorage(auth, req.params.id, req.body.storage_location_id)
  const full = await findOrderWithRelations(auth.businessId, order.id)
  res.json({ data: full })
})

export const orderStorageRelease = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const order = await releaseOrderFromStorage(auth, req.params.id)
  const full = await findOrderWithRelations(auth.businessId, order.id)
  res.json({ data: full })
})

export const orderStorageHistory = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const history = await getOrderStorageHistory(auth.businessId, req.params.id)
  res.json({ data: { history } })
})