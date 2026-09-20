import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import '../bootstrap'
import { startServer, stopServer, login, SEEDS, type ApiClient } from '../helpers'

let client: ApiClient
let serviceId: string
let garmentId: string
let unitPriceMinor: number
const TAX_BP = 500

beforeAll(async () => {
  await startServer()
  client = await login(SEEDS.ownerEmail, SEEDS.ownerPassword)
  const svc = await client.get('/services')
  const data = svc.body.data
  serviceId = data.services[0].id
  unitPriceMinor = data.services[0].prices[0].price_minor
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

function orderInput(customerId: string, quantity: number, requestId: string) {
  return {
    customer_id: customerId,
    intake_method: 'STORE_DROPOFF',
    return_method: 'CUSTOMER_PICKUP',
    items: [{ garment_type_id: garmentId, service_id: serviceId, quantity }],
    discount: { type: 'NONE' },
    client_request_id: requestId,
  }
}

describe('customer + order + payment flow', () => {
  let customer: any
  let order: any
  let total = 0

  it('creates a customer with normalized phone', async () => {
    customer = await makeCustomer('Test User', '9876500001')
    expect(customer.phone_e164).toBe('+919876500001')
    expect(customer.phone_country).toBe('IN')
  })

  it('rejects duplicate customer phone numbers', async () => {
    const dup = await client.post('/customers', { name: 'Other', phone: { raw: '9876500001', country: 'IN' } })
    expect(dup.status).toBe(409)
    expect(dup.body.error.code).toBe('DUPLICATE_CUSTOMER')
  })

  it('creates an order with server-computed pricing and an order number', async () => {
    const res = await client.post('/orders', orderInput(customer.id, 3, 'order-flow-1'))
    expect(res.status).toBe(201)
    order = res.body.data
    const subtotal = unitPriceMinor * 3
    const tax = Math.round((subtotal * TAX_BP) / 10000)
    total = subtotal + tax

    expect(order.order_number).toMatch(/^LND-\d{4}$/)
    expect(order.status).toBe('RECEIVED')
    expect(order.payment_status).toBe('UNPAID')
    expect(order.subtotal_minor).toBe(subtotal)
    expect(order.tax_minor).toBe(tax)
    expect(order.total_minor).toBe(total)
    expect(order.balance_minor).toBe(total)
    expect(order.amount_paid_minor).toBe(0)
    expect(order.items).toHaveLength(1)
    expect(order.items[0].unit_price_minor).toBe(unitPriceMinor)
    expect(order.items[0].line_total_minor).toBe(subtotal)
  })

  it('idempotent create with the same client_request_id returns the same order', async () => {
    const again = await client.post('/orders', orderInput(customer.id, 3, 'order-flow-1'))
    expect(again.status).toBe(201)
    expect(again.body.data.id).toBe(order.id)
  })

  it('rejects unknown pricing combinations', async () => {
    const bad = await client.post('/orders', {
      ...orderInput(customer.id, 1, 'order-flow-bad'),
      items: [{ garment_type_id: garmentId, service_id: '00000000-0000-4000-8000-000000000000', quantity: 1 }],
    })
    expect(bad.status).toBe(400)
    expect(bad.body.error.code).toBe('INVALID_ITEM')
  })

  it('records partial payments and recomputes balance/status', async () => {
    const partial = Math.floor(total / 2)
    const p1 = await client.post(`/orders/${order.id}/payments`, { amount_minor: partial, method: 'CASH', note: 'part one' })
    expect(p1.status).toBe(201)
    expect(p1.body.data.amount_paid_minor).toBe(partial)
    expect(p1.body.data.balance_minor).toBe(total - partial)
    expect(p1.body.data.payment_status).toBe('PARTIALLY_PAID')
  })

  it('blocks double-submitted payments via client_request_id', async () => {
    const reqId = 'pay-double-1'
    const first = await client.post(`/orders/${order.id}/payments`, { amount_minor: 10, method: 'UPI', client_request_id: reqId })
    expect(first.status).toBe(201)
    const second = await client.post(`/orders/${order.id}/payments`, { amount_minor: 10, method: 'CASH', client_request_id: reqId })
    expect(second.status).toBe(201)
    // SAME payment, no additional money taken
    expect(second.body.data.id).toBe(first.body.data.id)

    const det = await client.get(`/orders/${order.id}`)
    expect(det.body.data.payment_status).toBe('PARTIALLY_PAID')
    expect(det.body.data.amount_paid_minor).toBe(Math.floor(total / 2) + 10)
    expect(det.body.data.balance_minor).toBe(total - Math.floor(total / 2) - 10)
  })

  it('rejects overpayment', async () => {
    const over = await client.post(`/orders/${order.id}/payments`, { amount_minor: total + 1000, method: 'CASH' })
    expect(over.status).toBe(400)
    expect(over.body.error.code).toBe('OVERPAYMENT')
  })

  it('full payment marks the order PAID', async () => {
    const paidSoFar = Math.floor(total / 2) + 10
    const settle = await client.post(`/orders/${order.id}/payments`, { amount_minor: total - paidSoFar, method: 'CASH', note: 'settle' })
    expect(settle.status).toBe(201)
    expect(settle.body.data.payment_status).toBe('PAID')
    expect(settle.body.data.balance_minor).toBe(0)
    expect(settle.body.data.amount_paid_minor).toBe(total)
  })

  it('records refunds and reverts payment status', async () => {
    const refund = await client.post(`/orders/${order.id}/refunds`, { amount_minor: 5, method: 'CASH', note: 'return item' })
    expect(refund.status).toBe(201)
    expect(refund.body.data.payment_status).toBe('PARTIALLY_PAID')
    expect(refund.body.data.amount_paid_minor).toBe(total - 5)
    // cannot refund more than paid
    const tooMuch = await client.post(`/orders/${order.id}/refunds`, { amount_minor: 999999 })
    expect(tooMuch.status).toBe(400)
    expect(tooMuch.body.error.code).toBe('REFUND_EXCEEDS_PAID')
  })

  it('moves through statuses with valid transitions and rejects invalid ones', async () => {
    const move = async (status: string) => client.post(`/orders/${order.id}/status`, { status })
    expect((await move('WASHING')).status).toBe(200)
    expect((await move('DRYING')).status).toBe(200)
    expect((await move('IRONING')).status).toBe(200)
    expect((await move('READY')).status).toBe(200)
    const ready = await client.get(`/orders/${order.id}`)
    expect(ready.body.data.ready_at).toBeTruthy()
    const delivered = await move('DELIVERED')
    expect(delivered.status).toBe(200)
    expect(delivered.body.data.delivered_at).toBeTruthy()
    const bad = await move('RECEIVED')
    expect(bad.status).toBe(400)
    expect(bad.body.error.code).toBe('INVALID_TRANSITION')
  })

  it('finds an order by its human-readable number', async () => {
    const byNum = await client.get(`/orders/by-number/${order.order_number}`)
    expect(byNum.status).toBe(200)
    expect(byNum.body.data.id).toBe(order.id)
    expect(byNum.body.data.items).toHaveLength(1)
  })
})