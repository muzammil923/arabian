import { Request, Response } from 'express'
import { asyncHandler } from '../utils/http'
import { login } from '../services/auth.service'
import { COOKIE_NAME, cookieOptions } from '../lib/security'
import { q } from '../lib/turso'

export const authLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, businessId } = req.body as { email: string; password: string; businessId?: string }
  const result = await login(email, password, businessId)
  res.cookie(COOKIE_NAME, result.token, cookieOptions())
  res.json({ data: { user: result.user, businessId: result.businessId, role: result.role, branchId: result.branchId, businesses: result.businesses } })
})

export const authLogout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.json({ data: { loggedOut: true } })
})

export const authMe = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth as { id: string; email: string; name: string; role: string; businessId: string; branchId: string | null }
  const userRes = await q('SELECT id, email, name FROM users WHERE id = ?', [auth.id])
  const user = userRes.rows[0] as Record<string, unknown> | undefined
  const buRes = await q('SELECT id, role FROM business_users WHERE user_id = ? AND business_id = ?', [auth.id, auth.businessId])
  const membership = buRes.rows[0] as Record<string, unknown> | undefined
  res.json({
    data: {
      user: user ? { id: String(user.id), email: String(user.email), name: String(user.name) } : { id: auth.id, email: auth.email, name: auth.name },
      businessId: auth.businessId,
      role: membership ? String(membership.role) : auth.role,
      branchId: auth.branchId,
    },
  })
})