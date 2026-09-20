import type { AddressInfo } from 'net'
import type { Server as HttpServer } from 'http'

let server: HttpServer | null = null
let baseUrl = ''

export interface ApiClient {
  get: (path: string) => Promise<{ status: number; body: any }>
  post: (path: string, body?: unknown) => Promise<{ status: number; body: any }>
  patch: (path: string, body?: unknown) => Promise<{ status: number; body: any }>
  del: (path: string) => Promise<{ status: number; body: any }>
  logout: () => void
}

export async function startServer(): Promise<string> {
  const { default: app } = await import('../src/app')
  server = app.listen(0)
  await new Promise<void>((resolve) => {
    server!.once('listening', () => resolve())
  })
  const { port } = server!.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}/api`
  return baseUrl
}

export async function stopServer(): Promise<void> {
  if (!server) return
  await new Promise<void>((resolve) => {
    server!.close(() => resolve())
  })
  server = null
}

async function readBody(res: Response): Promise<any> {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function createClientWithCookie(initialCookie = ''): ApiClient {
  let cookieValue = initialCookie
  async function send(method: string, path: string, body?: unknown) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)
    try {
      const res = await fetch(baseUrl + path, {
        method,
        headers: {
          ...(cookieValue ? { cookie: cookieValue } : {}),
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      const parsed = await readBody(res)
      return { status: res.status, body: parsed }
    } finally {
      clearTimeout(timer)
    }
  }
  return {
    get: (p: string) => send('GET', p),
    post: (p: string, b?: unknown) => send('POST', p, b),
    patch: (p: string, b?: unknown) => send('PATCH', p, b),
    del: (p: string) => send('DELETE', p),
    logout: () => {
      cookieValue = ''
    },
    setCookie: (value: string) => {
      cookieValue = value
    },
  } as ApiClient & { setCookie: (value: string) => void }
}

export async function login(email: string, password: string): Promise<ApiClient> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(baseUrl + '/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    })
    await readBody(res)
    const setCookie = res.headers.get('set-cookie')
    const cookie = (setCookie || '').split(';')[0]
    const client = createClientWithCookie(cookie) as ApiClient & { setCookie: (value: string) => void }
    return client
  } finally {
    clearTimeout(timer)
  }
}

export const SEEDS = {
  ownerEmail: 'owner@demo.laundry',
  ownerPassword: 'Owner@1234',
}