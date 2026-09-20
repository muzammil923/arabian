import { Request, Response } from 'express'
import { asyncHandler } from '../utils/http'
import { listOrders, findOrderWithRelations, findOrderByNumber, findOrderWithRelationsByNumber } from '../repositories/orders'
import { changeOrderStatus, createOrder, markNotified, updateOrderDetails } from '../services/order.service'
import { listOrderPayments, recordPayment, refundOrder } from '../services/payment.service'

export const orderList = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const result = await listOrders(auth.businessId, req.query as never)
  res.json({ data: result })
})

export const orderCreate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const order = await createOrder(auth, req.body)
  res.status(201).json({ data: order })
})

export const orderDetail = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const order = await findOrderWithRelations(auth.businessId, req.params.id)
  if (!order) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found.' } })
    return
  }
  res.json({ data: order })
})

export const orderUpdate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const order = await updateOrderDetails(auth, req.params.id, req.body)
  res.json({ data: order })
})

export const orderStatus = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const order = await changeOrderStatus(auth, req.params.id, req.body.status, { force: req.body.force, note: req.body.note })
  res.json({ data: order })
})

export const orderMarkNotified = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const order = await markNotified(auth, req.params.id, req.body.notified ?? true)
  res.json({ data: order })
})

export const orderPaymentsList = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const payments = await listOrderPayments(auth.businessId, req.params.id)
  res.json({ data: payments })
})

export const paymentCreate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const order = await recordPayment(auth.businessId, req.params.id, auth, req.body, req.body.client_request_id)
  res.status(201).json({ data: order })
})

export const refundCreate = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const order = await refundOrder(auth.businessId, req.params.id, auth, req.body)
  res.status(201).json({ data: order })
})

export const orderByNumber = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!
  const order = await findOrderByNumber(auth.businessId, req.params.number)
  if (!order) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found.' } })
    return
  }
  const full = await findOrderWithRelationsByNumber(auth.businessId, req.params.number)
  res.json({ data: full })
})