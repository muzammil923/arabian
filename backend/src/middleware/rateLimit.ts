import { NextFunction, Request, Response } from 'express'
import { HttpError } from '../utils/http'

const WINDOW_MS = 15 * 60 * 1000
const MAX_HITS = 300
const AUTH_WINDOW_MS = 5 * 60 * 1000
const AUTH_MAX_HITS = 20

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function hit(key: string, windowMs: number): number {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return 1
  }
  b.count += 1
  return b.count
}

export function rateLimit(windowMs = WINDOW_MS, maxHits = MAX_HITS) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown'
    const count = hit(`api:${ip}`, windowMs)
    if (count > maxHits) {
      return next(new HttpError(429, 'Too many requests. Please try again later.', 'RATE_LIMITED'))
    }
    next()
  }
}

export function authRateLimit(_req: Request, _res: Response, next: NextFunction): void {
  const ip = _req.ip || _req.socket?.remoteAddress || 'unknown'
  const count = hit(`auth:${ip}`, AUTH_WINDOW_MS)
  if (count > AUTH_MAX_HITS) {
    return next(new HttpError(429, 'Too many login attempts. Please try again later.', 'RATE_LIMITED'))
  }
  next()
}