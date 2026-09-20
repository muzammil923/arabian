import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import '../bootstrap'
import { startServer, stopServer, login, SEEDS, type ApiClient } from '../helpers'

let client: ApiClient
let serviceId: string
let garmentId: string

beforeAll(async () => {
  await startServer()
  client = await login(SEEDS.ownerEmail, SEEDS.ownerPassword)
  const svc = await client.get('/services')
  const data = svc.body.data
  serviceId = data.services[0].id
  garmentId = data.services[0].prices[0].garment_type_id
})
afterAll(async () => {
  await stopServer()
})

async function makeCustomer(name: string, phone: string) {
  const res = await client.post('/customers', { name, phone: { raw: phone, country: 'IN' } })
  expect(res.status).toBe(201)
  return res.body.data
}

async function makeOrder(customerId: string, requestId: string) {
  const res = await client.post('/orders', {
    customer_id: customerId,
    intake_method: 'STORE_DROPOFF',
    return_method: 'CUSTOMER_PICKUP',
    items: [{ garment_type_id: garmentId, service_id: serviceId, quantity: 1 }],
    discount: { type: 'NONE' },
    client_request_id: requestId,
  })
  expect(res.status).toBe(201)
  return res.body.data
}

describe('storage / rack map', () => {
  let customer: any
  let order: any
  let rackLocationId: string

  it('lists seeded storage locations', async () => {
    const res = await client.get('/storage/locations')
    expect(res.status).toBe(200)
    const codes = res.body.data.locations.map((l: any) => l.code)
    expect(codes).toContain('A1')
    expect(codes).toContain('B4')
    rackLocationId = res.body.data.locations.find((l: any) => l.code === 'A1').id
  })

  it('creates and updates a storage location', async () => {
    const created = await client.post('/storage/locations', { code: 'X9', label: 'Test Rack X9', type: 'RACK', capacity: 1, position: 99 })
    expect(created.status).toBe(201)
    expect(created.body.data.code).toBe('X9')

    const dup = await client.post('/storage/locations', { code: 'x9', label: 'Duplicate' })
    expect(dup.status).toBe(409)
    expect(dup.body.error.code).toBe('DUPLICATE_CODE')

    const patched = await client.patch(`/storage/locations/${created.body.data.id}`, { capacity: 2, is_active: false })
    expect(patched.status).toBe(200)
    expect(patched.body.data.capacity).toBe(2)
    expect(patched.body.data.is_active).toBe(0)
  })

  it('assigns an order to a rack and reflects it on the rack map', async () => {
    customer = await makeCustomer('Rack User', '9876500101')
    order = await makeOrder(customer.id, 'rack-order-1')

    const assigned = await client.post(`/orders/${order.id}/storage`, { storage_location_id: rackLocationId })
    expect(assigned.status).toBe(200)
    expect(assigned.body.data.storage_location_id).toBe(rackLocationId)
    expect(assigned.body.data.storage_released_at).toBeNull()

    const again = await client.post(`/orders/${order.id}/storage`, { storage_location_id: rackLocationId })
    expect(again.status).toBe(409)
    expect(again.body.error.code).toBe('ALREADY_ASSIGNED')

    const map = await client.get('/storage/rack-map')
    const a1 = map.body.data.locations.find((l: any) => l.id === rackLocationId)
    expect(a1.occupied).toBe(1)
    expect(a1.items[0].order_id).toBe(order.id)
  })

  it('lists storage history for an order', async () => {
    const res = await client.get(`/orders/${order.id}/storage/history`)
    expect(res.status).toBe(200)
    const actions = res.body.data.history.map((h: any) => h.action)
    expect(actions).toContain('ASSIGN')
  })

  it('enforces location capacity', async () => {
    const small = await client.post('/storage/locations', { code: 'S1', label: 'Single Slot', type: 'RACK', capacity: 1, position: 98 })
    expect(small.status).toBe(201)
    const secondCustomer = await makeCustomer('Rack User 2', '9876500102')
    const secondOrder = await makeOrder(secondCustomer.id, 'rack-order-2')

    const first = await client.post(`/orders/${secondOrder.id}/storage`, { storage_location_id: small.body.data.id })
    expect(first.status).toBe(200)

    const thirdCustomer = await makeCustomer('Rack User 3', '9876500103')
    const thirdOrder = await makeOrder(thirdCustomer.id, 'rack-order-3')
    const overflow = await client.post(`/orders/${thirdOrder.id}/storage`, { storage_location_id: small.body.data.id })
    expect(overflow.status).toBe(409)
    expect(overflow.body.error.code).toBe('LOCATION_FULL')
  })

  it('releases an order and frees the slot', async () => {
    const released = await client.post(`/orders/${order.id}/storage/release`)
    expect(released.status).toBe(200)
    expect(released.body.data.storage_released_at).not.toBeNull()

    const map = await client.get('/storage/rack-map')
    const a1 = map.body.data.locations.find((l: any) => l.id === rackLocationId)
    expect(a1.occupied).toBe(0)
  })

  it('auto-releases storage when a delivery goes OUT_FOR_DELIVERY', async () => {
    const delCustomer = await makeCustomer('Delivery Rack User', '9876500104')
    const delOrder = await client.post('/orders', {
      customer_id: delCustomer.id,
      intake_method: 'STORE_DROPOFF',
      return_method: 'HOME_DELIVERY',
      items: [{ garment_type_id: garmentId, service_id: serviceId, quantity: 1 }],
      discount: { type: 'NONE' },
      client_request_id: 'rack-order-delivery',
    })
    expect(delOrder.status).toBe(201)
    const orderId = delOrder.body.data.id

    const assigned = await client.post(`/orders/${orderId}/storage`, { storage_location_id: rackLocationId })
    expect(assigned.status).toBe(200)

    const delivery = await client.post('/deliveries', {
      order_id: orderId,
      scheduled_date: '2030-01-10',
      address: {
        address_line_1: '2 Rack Road',
        city: 'Test City',
        state_region: 'TS',
        postal_code: '110001',
        country_code: 'IN',
      },
    })
    expect(delivery.status).toBe(201)
    const deliveryId = delivery.body.data.id

    const out = await client.post(`/deliveries/${deliveryId}/status`, { status: 'OUT_FOR_DELIVERY' })
    expect(out.status).toBe(200)

    const det = await client.get(`/orders/${orderId}`)
    expect(det.body.data.storage_released_at).not.toBeNull()
    expect(det.body.data.delivery.status).toBe('OUT_FOR_DELIVERY')
  })

  it('filters orders by payment method', async () => {
    const payCustomer = await makeCustomer('Cash Circle User', '9876500105')
    const cashOrder = await makeOrder(payCustomer.id, 'rack-order-cash')
    const upiOrder = await makeOrder(payCustomer.id, 'rack-order-upi')

    const cashPay = await client.post(`/orders/${cashOrder.id}/payments`, { amount_minor: 1, method: 'CASH' })
    expect(cashPay.status).toBe(201)
    const upiPay = await client.post(`/orders/${upiOrder.id}/payments`, { amount_minor: 1, method: 'UPI' })
    expect(upiPay.status).toBe(201)

    const cashOnly = await client.get(`/orders?payment_method=CASH`)
    expect(cashOnly.status).toBe(200)
    const cashIds = cashOnly.body.data.rows.map((r: any) => r.id)
    expect(cashIds).toContain(cashOrder.id)
    expect(cashIds).not.toContain(upiOrder.id)

    const upiOnly = await client.get(`/orders?payment_method=UPI`)
    const upiIds = upiOnly.body.data.rows.map((r: any) => r.id)
    expect(upiIds).toContain(upiOrder.id)
    expect(upiIds).not.toContain(cashOrder.id)
  })
})