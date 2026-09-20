import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import '../bootstrap'
import { startServer, stopServer, login, SEEDS } from '../helpers'

describe('auth & sessions', () => {
  beforeAll(async () => {
    await startServer()
  })
  afterAll(async () => {
    await stopServer()
  })

  it('rejects unauthenticated requests', async () => {
    const anonymous = await login('anonymous@example.com', 'whatever')
    const resp = await anonymous.get('/customers')
    expect(resp.status).toBe(401)
    expect(resp.body.error.code).toBe('UNAUTHORIZED')
  })

  it('does not allow invalid credentials and returns VALIDATION error shape', async () => {
    const { default: app } = await import('../../src/app')
    const server = app.listen(0)
    const { port } = server.address() as { port: number }
    const base = `http://127.0.0.1:${port}/api`
    try {
      const bad = await fetch(base + '/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email', password: '' }),
      })
      expect(bad.status).toBe(400)
      const vbody = await bad.json()
      expect(vbody.error.code).toBe('VALIDATION_ERROR')

      const wrong = await fetch(base + '/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: SEEDS.ownerEmail, password: 'wrong-password' }),
      })
      expect(wrong.status).toBe(401)
      const wbody = await wrong.json()
      expect(wbody.error.code).toBe('INVALID_CREDENTIALS')
    } finally {
      await new Promise<void>((r) => server.close(() => r()))
    }
  })

  it('logs in, reads me, and the session cookie works', async () => {
    const client = await login(SEEDS.ownerEmail, SEEDS.ownerPassword)
    const me = await client.get('/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.data.user.email).toBe('owner@demo.laundry')
    expect(me.body.data.role).toBe('OWNER')
    expect(me.body.data.businessId).toBeTruthy()
    expect(me.body.data.branchId).toBeTruthy()
  })

  it('logout clears the session', async () => {
    const client = await login(SEEDS.ownerEmail, SEEDS.ownerPassword)
    const out = await client.post('/auth/logout')
    expect(out.status).toBe(200)
    client.logout()
    const me = await client.get('/auth/me')
    expect(me.status).toBe(401)
  })
})