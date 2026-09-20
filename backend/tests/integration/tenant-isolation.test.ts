import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import '../bootstrap'
import { startServer, stopServer, login, SEEDS, type ApiClient } from '../helpers'
import { q } from '../../src/lib/turso'
import bcrypt from 'bcryptjs'

let ownerClient: ApiClient
let otherClient: ApiClient
let serviceId: string
let garmentId: string
let victimCustomerId: string
let victimOrderId: string

beforeAll(async () => {
  await startServer()
  ownerClient = await login(SEEDS.ownerEmail, SEEDS.ownerPassword)
  const svc = await ownerClient.get('/services')
  serviceId = svc.body.data.services[0].id
  garmentId = svc.body.data.services[0].prices[0].garment_type_id

  const cust = await ownerClient.post('/customers', { name: 'Victim Co', phone: { raw: '9876500099', country: 'IN' } })
  victimCustomerId = cust.body.data.id
  const order = await ownerClient.post('/orders', {
    customer_id: victimCustomerId,
    intake_method: 'STORE_DROPOFF',
    return_method: 'CUSTOMER_PICKUP',
    items: [{ garment_type_id: garmentId, service_id: serviceId, quantity: 1 }],
    client_request_id: `iso-${Math.random().toString(36).slice(2)}`,
  })
  victimOrderId = order.body.data.id

  // Create a SECOND business on the same shared server.
  const ts = new Date().toISOString()
  const b2 = '20000000-0000-4000-8000-000000000002'
  const branch2 = '20000000-0000-4000-8000-0000000000b2'
  const u2 = '20000000-0000-4000-8000-0000000000u2'
  const hash = await bcrypt.hash('TenantB@1234', 10)
  await q('INSERT INTO businesses (id, name, country_code, currency, timezone, tax_bp, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)', [b2, 'Second Tenant', 'IN', 'INR', 'Asia/Kolkata', 500, ts, ts])
  await q('INSERT INTO branches (id, business_id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)', [branch2, b2, 'Main', ts, ts])
  await q('INSERT INTO users (id, email, password_hash, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)', [u2, 'owner.b@second.test', hash, 'Owner B', ts, ts])
  await q('INSERT INTO business_users (id, business_id, user_id, branch_id, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)', ['20000000-0000-4000-8000-0000000000bu', b2, u2, branch2, 'OWNER', ts, ts])

  otherClient = await login('owner.b@second.test', 'TenantB@1234')
})
afterAll(async () => {
  await stopServer()
})

describe('multi-tenant isolation', () => {
  it('tenant B cannot list tenant A customers', async () => {
    const list = await otherClient.get('/customers')
    expect(list.status).toBe(200)
    const ids = list.body.data.rows.map((c: any) => c.id)
    expect(ids).not.toContain(victimCustomerId)
  })

  it('tenant B cannot read tenant A customer profiles', async () => {
    const res = await otherClient.get(`/customers/${victimCustomerId}`)
    expect(res.status).toBe(404)
  })

  it('tenant B cannot read tenant A orders', async () => {
    const res = await otherClient.get(`/orders/${victimOrderId}`)
    expect(res.status).toBe(404)
    const byNum = await otherClient.get(`/orders/by-number/does-not-matter`)
    expect(byNum.status).toBe(404)
  })

  it('tenant B cannot act on tenant A orders', async () => {
    const pay = await otherClient.post(`/orders/${victimOrderId}/payments`, { amount_minor: 10, method: 'CASH' })
    expect(pay.status).toBe(404)
    const move = await otherClient.post(`/orders/${victimOrderId}/status`, { status: 'READY' })
    expect(move.status).toBe(404)
  })

  it('tenant B cannot read tenant A settings', async () => {
    const settings = await otherClient.get('/settings')
    // Tenant B has no settings row of its own; it must never see tenant A's.
    expect(settings.status).toBe(404)
  })

  it('tenant B can run its own full flow without touching A', async () => {
    const svc = await otherClient.post('/services', { name: 'Wash & Fold' })
    expect(svc.status).toBe(201)
    const s2 = svc.body.data
    const gar = await otherClient.post('/garments', { name: 'Shirt' })
    expect(gar.status).toBe(201)
    const g2 = gar.body.data
    const price = await otherClient.post('/pricing', { entries: [{ service_id: s2.id, garment_type_id: g2.id, price_minor: 8000 }] })
    expect(price.status).toBe(200)

    const c = await otherClient.post('/customers', { name: 'Tenant B Customer', phone: { raw: '9876500011', country: 'IN' } })
    expect(c.status).toBe(201)
    const o = await otherClient.post('/orders', {
      customer_id: c.body.data.id,
      intake_method: 'STORE_DROPOFF',
      return_method: 'CUSTOMER_PICKUP',
      items: [{ garment_type_id: g2.id, service_id: s2.id, quantity: 1 }],
      client_request_id: `iso-${Math.random().toString(36).slice(2)}`,
    })
    expect(o.status).toBe(201)
    expect(o.body.data.order_number).toMatch(/^LND-\d{4}$/)
    expect(o.body.data.total_minor).toBe(8400) // 8000 + 5% tax
    expect(o.body.data.tax_minor).toBe(400)
    expect(o.body.data.payment_status).toBe('UNPAID')
  })
})