import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

let loaded = false

/**
 * Loads the nearest .env file by walking up from process.cwd().
 * Works from any workspace directory (root, backend, frontend, database).
 */
export function loadEnv(): void {
  if (loaded) return
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, '.env')
    if (fs.existsSync(candidate)) dotenv.config({ path: candidate })
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  loaded = true
}

export const env = {
  get tursoDatabaseUrl() {
    return process.env.TURSO_DATABASE_URL || 'file:./data/laundry.db'
  },
  get tursoAuthToken() {
    return process.env.TURSO_AUTH_TOKEN || undefined
  },
  get jwtSecret() {
    return process.env.JWT_SECRET || 'dev-secret-do-not-use-in-production'
  },
  get jwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || '7d'
  },
  get port() {
    return Number(process.env.PORT || 3000)
  },
  get nodeEnv() {
    return process.env.NODE_ENV || 'development'
  },
  get frontendUrl() {
    if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
    return 'http://localhost:5173'
  },
  get cookieSecure() {
    if (process.env.COOKIE_SECURE !== undefined) return process.env.COOKIE_SECURE === 'true'
    return !!process.env.VERCEL_URL
  },
  get cookieSameSite() {
    return (process.env.COOKIE_SAMESITE || 'lax') as 'lax' | 'strict' | 'none'
  },
}