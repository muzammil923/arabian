import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { authRateLimit } from '../middleware/rateLimit'
import { validate } from '../middleware/validate'
import {
  loginSchema,
  staffCreateSchema,
  staffUpdateSchema,
} from '../validators/auth'
import {
  customerCreateSchema,
  customerQuerySchema,
  customerUpdateSchema,
  addressCreateSchema,
  addressUpdateSchema,
} from '../validators/customer'
import {
  createOrderSchema,
  orderQuerySchema,
  orderStatusSchema,
  paymentCreateSchema,
  refundCreateSchema,
  updateOrderSchema,
  notifiedSchema,
} from '../validators/order'
import {
  deliveryCreateSchema,
  deliveryStatusSchema,
  deliveryUpdateSchema,
  pickupCreateSchema,
  pickupStatusSchema,
  pickupUpdateSchema,
  logisticsQuerySchema,
} from '../validators/logistics'
import {
  garmentPatchSchema,
  garmentSchema,
  priceBulkSchema,
  servicePatchSchema,
  serviceSchema,
} from '../validators/reference'
import {
  branchCreateSchema,
  branchPatchSchema,
  businessSettingsSchema,
  reportQuerySchema,
} from '../validators/manage'
import {
  storageAssignSchema,
  storageLocationCreateSchema,
  storageLocationPatchSchema,
  storageLocationsQuerySchema,
} from '../validators/storage'

import { authLogin, authLogout, authMe } from '../controllers/auth.controller'
import {
  addressCreate,
  addressDelete,
  addressUpdate,
  customerCreate,
  customerDetail,
  customerList,
  customerUpdate,
} from '../controllers/customer.controller'
import {
  orderByNumber,
  orderCreate,
  orderDetail,
  orderList,
  orderMarkNotified,
  orderPaymentsList,
  orderStatus,
  orderUpdate,
  paymentCreate,
  refundCreate,
} from '../controllers/order.controller'
import {
  deliveryCreate,
  deliveryDetail,
  deliveryList,
  deliveryStatus,
  deliveryUpdate,
  pickupCreate,
  pickupDetail,
  pickupList,
  pickupStatus,
  pickupUpdate,
} from '../controllers/logistics.controller'
import {
  garmentCreate,
  garmentList,
  garmentPatch,
  priceDelete,
  priceList,
  priceUpdate,
  serviceCreate,
  serviceList,
  servicePatch,
} from '../controllers/reference.controller'
import {
  reportDashboard,
  reportDeliveries,
  reportOrders,
  reportPayments,
  reportPickups,
  reportRevenue,
  reportStaff,
} from '../controllers/report.controller'
import {
  branchCreate,
  branchList,
  branchPatch,
  settingsGet,
  settingsPatch,
  staffCreate,
  staffDelete,
  staffList,
  staffPatch,
  whatsappBuild,
} from '../controllers/settings.controller'
import {
  orderStorageAssign,
  orderStorageHistory,
  orderStorageRelease,
  rackMapGet,
  storageLocationCreate,
  storageLocationPatch,
  storageLocationsList,
} from '../controllers/storage.controller'

import { requireRole } from '../middleware/auth'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok' } })
})

// ----- AUTH -----
router.post('/api/auth/login', authRateLimit, validate(loginSchema), authLogin)
router.post('/api/auth/logout', authLogout)
router.get('/api/auth/me', requireAuth, authMe)

// ----- CUSTOMERS -----
router.get('/api/customers', requireAuth, validate(customerQuerySchema, 'query'), customerList)
router.post('/api/customers', requireAuth, validate(customerCreateSchema), customerCreate)
router.get('/api/customers/:id', requireAuth, customerDetail)
router.patch('/api/customers/:id', requireAuth, validate(customerUpdateSchema), customerUpdate)
router.post('/api/customers/:customerId/addresses', requireAuth, validate(addressCreateSchema), addressCreate)
router.patch('/api/customers/:customerId/addresses/:addressId', requireAuth, validate(addressUpdateSchema), addressUpdate)
router.delete('/api/customers/:customerId/addresses/:addressId', requireAuth, addressDelete)

// ----- ORDERS -----
router.get('/api/orders', requireAuth, validate(orderQuerySchema, 'query'), orderList)
router.post('/api/orders', requireAuth, validate(createOrderSchema), orderCreate)
router.get('/api/orders/by-number/:number', requireAuth, orderByNumber)
router.get('/api/orders/:id', requireAuth, orderDetail)
router.patch('/api/orders/:id', requireAuth, validate(updateOrderSchema), orderUpdate)
router.post('/api/orders/:id/status', requireAuth, validate(orderStatusSchema), orderStatus)
router.post('/api/orders/:id/notified', requireAuth, validate(notifiedSchema), orderMarkNotified)
router.get('/api/orders/:id/payments', requireAuth, orderPaymentsList)
router.post('/api/orders/:id/payments', requireAuth, validate(paymentCreateSchema), paymentCreate)
router.post('/api/orders/:id/refunds', requireAuth, validate(refundCreateSchema), refundCreate)
router.post('/api/orders/:id/storage', requireAuth, validate(storageAssignSchema), orderStorageAssign)
router.post('/api/orders/:id/storage/release', requireAuth, orderStorageRelease)
router.get('/api/orders/:id/storage/history', requireAuth, orderStorageHistory)

// ----- PICKUPS -----
router.get('/api/pickups', requireAuth, validate(logisticsQuerySchema, 'query'), pickupList)
router.post('/api/pickups', requireAuth, validate(pickupCreateSchema), pickupCreate)
router.get('/api/pickups/:id', requireAuth, pickupDetail)
router.patch('/api/pickups/:id', requireAuth, validate(pickupUpdateSchema), pickupUpdate)
router.post('/api/pickups/:id/status', requireAuth, validate(pickupStatusSchema), pickupStatus)

// ----- DELIVERIES -----
router.get('/api/deliveries', requireAuth, validate(logisticsQuerySchema, 'query'), deliveryList)
router.post('/api/deliveries', requireAuth, validate(deliveryCreateSchema), deliveryCreate)
router.get('/api/deliveries/:id', requireAuth, deliveryDetail)
router.patch('/api/deliveries/:id', requireAuth, validate(deliveryUpdateSchema), deliveryUpdate)
router.post('/api/deliveries/:id/status', requireAuth, validate(deliveryStatusSchema), deliveryStatus)

// ----- SERVICES / GARMENTS / PRICING -----
router.get('/api/services', requireAuth, serviceList)
router.post('/api/services', requireAuth, requireRole('OWNER', 'ADMIN', 'MANAGER'), validate(serviceSchema), serviceCreate)
router.patch('/api/services/:id', requireAuth, requireRole('OWNER', 'ADMIN', 'MANAGER'), validate(servicePatchSchema), servicePatch)
router.get('/api/garments', requireAuth, garmentList)
router.post('/api/garments', requireAuth, requireRole('OWNER', 'ADMIN', 'MANAGER'), validate(garmentSchema), garmentCreate)
router.patch('/api/garments/:id', requireAuth, requireRole('OWNER', 'ADMIN', 'MANAGER'), validate(garmentPatchSchema), garmentPatch)
router.get('/api/pricing', requireAuth, priceList)
router.post('/api/pricing', requireAuth, requireRole('OWNER', 'ADMIN', 'MANAGER'), validate(priceBulkSchema), priceUpdate)
router.patch('/api/pricing/:serviceId/:garmentTypeId', requireAuth, requireRole('OWNER', 'ADMIN', 'MANAGER'), priceDelete)

// ----- REPORTS -----
router.get('/api/reports/dashboard', requireAuth, reportDashboard)
router.get('/api/reports/revenue', requireAuth, validate(reportQuerySchema, 'query'), reportRevenue)
router.get('/api/reports/payments', requireAuth, validate(reportQuerySchema, 'query'), reportPayments)
router.get('/api/reports/pickups', requireAuth, validate(reportQuerySchema, 'query'), reportPickups)
router.get('/api/reports/deliveries', requireAuth, validate(reportQuerySchema, 'query'), reportDeliveries)
router.get('/api/reports/staff', requireAuth, validate(reportQuerySchema, 'query'), reportStaff)
router.get('/api/reports/orders', requireAuth, validate(reportQuerySchema, 'query'), reportOrders)

// ----- SETTINGS / STAFF / BRANCHES -----
router.get('/api/settings', requireAuth, settingsGet)
router.patch('/api/settings', requireAuth, requireRole('OWNER', 'ADMIN'), validate(businessSettingsSchema), settingsPatch)
router.get('/api/staff', requireAuth, staffList)
router.post('/api/staff', requireAuth, requireRole('OWNER', 'ADMIN', 'MANAGER'), validate(staffCreateSchema), staffCreate)
router.patch('/api/staff/:id', requireAuth, requireRole('OWNER', 'ADMIN', 'MANAGER'), validate(staffUpdateSchema), staffPatch)
router.delete('/api/staff/:id', requireAuth, requireRole('OWNER', 'ADMIN', 'MANAGER'), staffDelete)
router.get('/api/branches', requireAuth, branchList)
router.post('/api/branches', requireAuth, requireRole('OWNER', 'ADMIN', 'MANAGER'), validate(branchCreateSchema), branchCreate)
router.patch('/api/branches/:id', requireAuth, requireRole('OWNER', 'ADMIN', 'MANAGER'), validate(branchPatchSchema), branchPatch)

// ----- WHATSAPP -----
router.get('/api/whatsapp/link', requireAuth, whatsappBuild)

// ----- STORAGE / RACK MAP -----
router.get('/api/storage/locations', requireAuth, validate(storageLocationsQuerySchema, 'query'), storageLocationsList)
router.post('/api/storage/locations', requireAuth, requireRole('OWNER', 'ADMIN', 'MANAGER'), validate(storageLocationCreateSchema), storageLocationCreate)
router.patch('/api/storage/locations/:id', requireAuth, requireRole('OWNER', 'ADMIN', 'MANAGER'), validate(storageLocationPatchSchema), storageLocationPatch)
router.get('/api/storage/rack-map', requireAuth, rackMapGet)

export default router