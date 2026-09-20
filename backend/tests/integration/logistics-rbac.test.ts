import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import '../bootstrap'
import { startServer, stopServer, login, SEEDS, type ApiClient } from '../helpers'

let owner: ApiClient
let staff: ApiClient
let serviceId: string
let garmentId: string
let customerId: string

beforeAll(async () => {
  await startServer()
  owner = await login(SEEDS.ownerEmail, SEEDS.ownerPassword)
  staff = await login('staff@demo.laundry', 'Staff@1234')
  const svc = await owner.get('/services')
  serviceId = svc.body.data.services[0].id
  garmentId = svc.body.data.services[0].prices[0].garment_type_id
  const cust = await owner.post('/customers', { name: 'Logistics Customer', phone: { raw: '9876500077', country: 'IN' } })
  customerId = cust.body.data.id
})
afterAll(async () => {
  await stopServer()
})

const address = {
  label: 'Home',
  address_line_1: '42 MG Road',
  city: 'Bengaluru',
  postal_code: '560001',
  country_code: 'IN',
}

describe('pickups', () => {
  let pickupId: string

  it('creates a scheduled pickup', async () => {
    const res = await owner.post('/pickups', {
      customer_id: customerId,
      scheduled_date: '2026-10-01',
      scheduled_slot: '10:00-12:00',
      address,
    })
    expect(res.status).toBe(201)
    pickupId = res.body.data.id
    expect(res.body.data.status).toBe('SCHEDULED')
    expect(JSON.parse(res.body.data.address_snapshot).address_line_1).toBe('42 MG Road')
  })

  it('advances pickup status through valid transitions', async () => {
    expect((await owner.post(`/pickups/${pickupId}/status`, { status: 'ASSIGNED' })).status).toBe(200)
    expect((await owner.post(`/pickups/${pickupId}/status`, { status: 'OUT_FOR_PICKUP' })).status).toBe(200)
    const picked = await owner.post(`/pickups/${pickupId}/status`, { status: 'PICKED_UP' })
    expect(picked.status).toBe(200)
    expect(picked.body.data.status).toBe('PICKED_UP')
    const invalid = await owner.post(`/pickups/${pickupId}/status`, { status: 'SCHEDULED' })
    expect(invalid.status).toBe(400)
    expect(invalid.body.error.code).toBe('INVALID_TRANSITION')
  })

  it('creates an order linked to the pickup', async () => {
    const res = await owner.post('/orders', {
      customer_id: customerId,
      intake_method: 'HOME_PICKUP',
      return_method: 'CUSTOMER_PICKUP',
      pickup_id: pickupId,
      items: [{ garment_type_id: garmentId, service_id: serviceId, quantity: 2 }],
      client_request_id: `pickup-order-${Math.random().toString(36).slice(2)}`,
    })
    expect(res.status).toBe(201)
    expect(res.body.data.pickup_id).toBe(pickupId)
  })
})

describe('deliveries', () => {
  let orderId: string
  let deliveryId: string

  it('schedules a delivery only for HOME_DELIVERY orders', async () => {
    const order = await owner.post('/orders', {
      customer_id: customerId,
      intake_method: 'STORE_DROPOFF',
      return_method: 'HOME_DELIVERY',
      items: [{ garment_type_id: garmentId, service_id: serviceId, quantity: 2 }],
      client_request_id: `delivery-order-${Math.random().toString(36).slice(2)}`,
    })
    orderId = order.body.data.id

    const res = await owner.post('/deliveries', { order_id: orderId, scheduled_date: '2026-10-02', scheduled_slot: '16:00-18:00', address })
    expect(res.status).toBe(201)
    deliveryId = res.body.data.id
    expect(res.body.data.status).toBe('SCHEDULED')

    const dup = await owner.post('/deliveries', { order_id: orderId, address })
    expect(dup.status).toBe(400)
    expect(dup.body.error.code).toBe('DELIVERY_EXISTS')
  })

  it('rejects scheduling a delivery for customer-pickup orders', async () => {
    const order = await owner.post('/orders', {
      customer_id: customerId,
      intake_method: 'STORE_DROPOFF',
      return_method: 'CUSTOMER_PICKUP',
      items: [{ garment_type_id: garmentId, service_id: serviceId, quantity: 1 }],
      client_request_id: `no-delivery-${Math.random().toString(36).slice(2)}`,
    })
    const res = await owner.post('/deliveries', { order_id: order.body.data.id, address })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('WRONG_RETURN_METHOD')
  })

  it('marks the delivery delivered', async () => {
    const out = await owner.post(`/deliveries/${deliveryId}/status`, { status: 'OUT_FOR_DELIVERY' })
    expect(out.status).toBe(200)
    const done = await owner.post(`/deliveries/${deliveryId}/status`, { status: 'DELIVERED' })
    expect(done.status).toBe(200)
    expect(done.body.data.status).toBe('DELIVERED')
    expect(done.body.data.delivered_at).toBeTruthy()
  })
})

describe('role-based access control', () => {
  it('staff can create orders but not apply discounts', async () => {
    const ok = await staff.post('/orders', {
      customer_id: customerId,
      intake_method: 'STORE_DROPOFF',
      return_method: 'CUSTOMER_PICKUP',
      items: [{ garment_type_id: garmentId, service_id: serviceId, quantity: 1 }],
      client_request_id: `staff-${Math.random().toString(36).slice(2)}`,
    })
    expect(ok.status).toBe(201)

    const discounted = await staff.post('/orders', {
      customer_id: customerId,
      intake_method: 'STORE_DROPOFF',
      return_method: 'CUSTOMER_PICKUP',
      items: [{ garment_type_id: garmentId, service_id: serviceId, quantity: 1 }],
      discount: { type: 'PERCENTAGE', percent_bp: 1000 },
      client_request_id: `staff-disc-${Math.random().toString(36).slice(2)}`,
    })
    expect(discounted.status).toBe(403)
  })

  it('staff cannot manage services or pricing', async () => {
    const svc = await staff.post('/services', { name: 'Should Fail' })
    expect(svc.status).toBe(403)
    const price = await staff.post('/pricing', { entries: [{ service_id: serviceId, garment_type_id: garmentId, price_minor: 1 }] })
    expect(price.status).toBe(403)
  })

  it('staff cannot manage staff or edit settings', async () => {
    const s = await staff.post('/staff', { name: 'Nope', email: 'nope@demo.laundry', password: 'Nope@1234', role: 'STAFF' })
    expect(s.status).toBe(403)
    const settings = await staff.patch('/settings', { name: 'Hacked' })
    expect(settings.status).toBe(403)
  })
})