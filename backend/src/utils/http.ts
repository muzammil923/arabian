export class HttpError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, message: string, code = 'ERROR', details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function badRequest(message: string, code = 'BAD_REQUEST', details?: unknown): HttpError {
  return new HttpError(400, message, code, details)
}

export function unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED'): HttpError {
  return new HttpError(401, message, code)
}

export function forbidden(message = 'Forbidden', code = 'FORBIDDEN'): HttpError {
  return new HttpError(403, message, code)
}

export function notFound(message = 'Not found', code = 'NOT_FOUND'): HttpError {
  return new HttpError(404, message, code)
}

export function conflict(message: string, code = 'CONFLICT', details?: unknown): HttpError {
  return new HttpError(409, message, code, details)
}

import { Request, RequestHandler, Response, NextFunction } from 'express'

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

export function asyncHandler(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}