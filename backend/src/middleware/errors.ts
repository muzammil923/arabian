import { NextFunction, Request, Response } from 'express'
import { HttpError } from '../utils/http'
import { logger } from '../lib/logger'
import { env } from '../config/env'

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new HttpError(404, `Route ${req.method} ${req.originalUrl} not found.`, 'NOT_FOUND'))
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } })
    return
  }
  const e = err as { message?: string; code?: string; type?: string; status?: number }
  if (e && (e.code === 'SQLITE_CONSTRAINT' || e.code === 'SQLITE_CONSTRAINT_UNIQUE' || e.code === 'SQLITE_CONSTRAINT_FOREIGNKEY')) {
    logger.error('Database constraint error', { message: e.message })
    res.status(409).json({ error: { code: 'CONFLICT', message: 'This record already exists or violates a relationship.' } })
    return
  }
  if (e && e.type === 'entity.parse.failed') {
    logger.warn('Malformed JSON request body', { message: e.message })
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body contains invalid JSON.' } })
    return
  }
  if (typeof e?.status === 'number' && e.status >= 400 && e.status < 500) {
    logger.warn('Client error', { status: e.status, message: e.message })
    res.status(e.status).json({ error: { code: 'BAD_REQUEST', message: e.message ?? 'Invalid request.' } })
    return
  }
  if (e && typeof e.code === 'string' && e.code.startsWith('LIBSQL_')) {
    logger.error('Database error', { message: e.message })
    res.status(500).json({ error: { code: 'DATABASE_ERROR', message: 'A database error occurred. Please try again.' } })
    return
  }
  logger.error('Unhandled error', e ? { message: e.message } : { err })
  const showDetail = env.nodeEnv !== 'production'
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
      ...(showDetail && e?.message ? { internal: e.message } : {}),
    },
  })
}