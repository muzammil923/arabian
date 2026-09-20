import { q } from '../lib/turso'
import { HttpError } from './http'

/**
 * Concurrency-safe sequence counter for human-readable document numbers
 * (orders, invoices). Uses an atomic UPSERT ... RETURNING so two concurrent
 * requests can never receive the same value. Gaps are acceptable (sequences
 * are not required to be gap-free), uniqueness is what matters.
 */
export async function nextSequence(businessId: string, name: string): Promise<number> {
  const result = await q({
    sql: `INSERT INTO counters (business_id, name, value) VALUES (?, ?, 1)
          ON CONFLICT(business_id, name) DO UPDATE SET value = value + 1
          RETURNING value`,
    args: [businessId, name],
  })
  const value = result.rows[0]?.value
  if (typeof value !== 'number') {
    throw new HttpError(500, 'Unable to generate document number.')
  }
  return value
}

export function formatSequenceNumber(prefix: string, value: number, minDigits = 4): string {
  const padded = String(value).padStart(minDigits, '0')
  return `${prefix}${padded}`
}

export function stripPrefixClean(prefix: string): string {
  return prefix.replace(/[^A-Za-z0-9-]/g, '')
}