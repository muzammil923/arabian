import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export interface TokenPayload {
  sub: string
  businessId: string
  role: string
}

export function signToken(userId: string, businessId: string, role: string): string {
  const payload: TokenPayload = { sub: userId, businessId, role }
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] })
}

export interface VerifiedToken {
  sub: string
  businessId: string
  role: string
  iat: number
  exp: number
}

export function verifyToken(token: string): VerifiedToken {
  return jwt.verify(token, env.jwtSecret) as VerifiedToken
}

export const COOKIE_NAME = 'lq_token'
export const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    path: '/',
    maxAge: COOKIE_MAX_AGE_MS,
  } as const
}