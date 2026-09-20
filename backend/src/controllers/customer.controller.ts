import { Request, Response } from 'express'
import { asyncHandler } from '../utils/http'
import {
  createCustomer,
  getCustomerProfile,
  searchCustomers,
  updateCustomer,
  addCustomerAddress,
  updateCustomerAddress,
  removeCustomerAddress,
} from '../services/customer.service'

export const customerList = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const result = await searchCustomers(auth.businessId, req.query as { search?: string; page?: number; limit?: number })
  res.json({ data: result })
})

export const customerCreate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const customer = await createCustomer(auth, req.body)
  res.status(201).json({ data: customer })
})

export const customerDetail = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const profile = await getCustomerProfile(auth, req.params.id)
  res.json({ data: profile })
})

export const customerUpdate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const customer = await updateCustomer(auth, req.params.id, req.body)
  res.json({ data: customer })
})

export const addressCreate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const address = await addCustomerAddress(auth, req.params.customerId, req.body)
  res.status(201).json({ data: address })
})

export const addressUpdate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const address = await updateCustomerAddress(auth, req.params.customerId, req.params.addressId, req.body)
  res.json({ data: address })
})

export const addressDelete = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const result = await removeCustomerAddress(auth, req.params.customerId, req.params.addressId)
  res.json({ data: result })
})