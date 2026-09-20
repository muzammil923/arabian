import { NextFunction, Request, Response } from 'express'
import { ZodTypeAny, z } from 'zod'
import { badRequest } from '../utils/http'

type Source = 'body' | 'query' | 'params'

export function validate(schema: ZodTypeAny, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[source])
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      return next(badRequest('Invalid input.', 'VALIDATION_ERROR', issues))
    }
    req[source] = parsed.data as never
    next()
  }
}

export const zId = z.string().uuid()
export const zBool = z.union([z.boolean(), z.literal(0), z.literal(1), z.literal('true'), z.literal('false')]).transform((v) => v === true || v === 1 || v === 'true')
export const zMinor = z.number().int().min(0)