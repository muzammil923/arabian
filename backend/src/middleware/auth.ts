import { NextFunction, Request, Response } from 'express'
import { q } from '../lib/turso'
import { COOKIE_NAME, verifyToken } from '../lib/security'
import { forbidden, unauthorized } from '../utils/http'
import { AuthUser, Role, ROLE_RANK } from '../types'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthUser
    }
  }
}

async function loadAuthContext(userId: string, businessId: string): Promise<AuthUser> {
  const user = await q(
    `SELECT u.id, u.email, u.name, u.is_active AS user_active,
            bu.role, bu.is_active AS membership_active, bu.branch_id
     FROM users u
     JOIN business_users bu ON bu.user_id = u.id AND bu.business_id = ?
     WHERE u.id = ?`,
    [businessId, userId],
  )
  const row = user.rows[0]
  if (!row) return Promise.reject(unauthorized('Session is no longer valid.'))
  if (!row.user_active || !row.membership_active) {
    return Promise.reject(unauthorized('Your account has been deactivated.'))
  }
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    role: String(row.role) as Role,
    businessId,
    branchId: row.branch_id ? String(row.branch_id) : null,
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.[COOKIE_NAME]
    const header = req.headers.authorization
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined
    const token = cookieToken || bearer
    if (!token) return next(unauthorized('Authentication required.'))
    const payload = verifyToken(token)
    if (!payload.sub || !payload.businessId) return next(unauthorized('Invalid session.'))
    req.auth = await loadAuthContext(payload.sub, payload.businessId)
    next()
  } catch (err) {
    const e = err as { status?: number }
    if (e && e.status) return next(err)
    return next(unauthorized('Your session has expired. Please log in again.'))
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) return next(unauthorized())
    const minRank = Math.max(...roles.map((r) => ROLE_RANK[r]))
    if (ROLE_RANK[req.auth.role] < minRank) {
      return next(forbidden('You do not have permission to perform this action.'))
    }
    next()
  }
}