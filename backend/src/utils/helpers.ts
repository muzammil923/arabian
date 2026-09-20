import { randomUUID } from 'crypto'
import { q } from '../lib/turso'

export function newId(): string {
  return randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** Applies a meaningful timezone-aware local date string for a business (YYYY-MM-DD). */
export function localDate(isoString: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(isoString))
  } catch {
    return isoString.slice(0, 10)
  }
}

export function localDateTime(isoString: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(isoString))
  } catch {
    return isoString
  }
}

/** Creates a date string (YYYY-MM-DD) for today in the business timezone. */
export function todayInTimezone(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const map: Record<string, string> = {}
    for (const p of parts) map[p.type] = p.value
    return `${map.year}-${map.month}-${map.day}`
  } catch {
    return nowIso().slice(0, 10)
  }
}

export interface AuditEntry {
  businessId: string
  userId: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown> | null
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await q({
    sql: `INSERT INTO audit_logs (id, business_id, user_id, action, entity_type, entity_id, metadata, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      newId(),
      entry.businessId,
      entry.userId,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      nowIso(),
    ],
  })
}