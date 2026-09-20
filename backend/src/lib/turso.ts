import { createRequire } from 'module'
import type { Client, InStatement, InValue, ResultSet } from '@libsql/client'
import fs from 'fs'
import path from 'path'
import { loadEnv, env } from '../config/env'

const runtimeRequire = createRequire(__filename)

function clientModuleFor(url: string): string {
  // The pure-JS HTTP client has no native bindings, so it bundles cleanly in
  // serverless environments. The node client (local file DBs, dev/tests) is
  // only required when actually pointed at a file: URL.
  return url.startsWith('https://') || url.startsWith('http://') ? '@libsql/client/http' : '@libsql/client'
}

export function createDb(url: string, authToken?: string): Client {
  const httpUrl = url.startsWith('libsql://') ? `https://${url.slice('libsql://'.length)}` : url
  const createClient = runtimeRequire(clientModuleFor(httpUrl)).createClient as unknown as (config: {
    url: string
    authToken?: string
  }) => Client
  return createClient({ url: httpUrl, authToken: authToken || undefined })
}

/**
 * Business default database client. Supports Turso (https://...) or a local
 * libSQL file (file:...) out of the box for development.
 */
export function getDb(): Client {
  loadEnv()
  const url = env.tursoDatabaseUrl
  if (url.startsWith('file:')) {
    if (process.env.VERCEL) {
      console.warn('[turso] TURSO_DATABASE_URL is a local file on Vercel. Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (Turso cloud) or most API calls will fail.')
    }
    const filePath = url.replace('file:', '')
    const dir = path.dirname(filePath)
    if (dir && dir !== '.') {
      try {
        fs.mkdirSync(dir, { recursive: true })
      } catch {
        // Read-only filesystems (e.g. Vercel serverless) can't create DB files.
      }
    }
  }
  const db = createDb(url, env.tursoAuthToken)
  // Best-effort FK enforcement for local file databases.
  void db.execute({ sql: 'PRAGMA foreign_keys = ON', args: [] }).catch(() => undefined)
  return db
}

export const db = getDb()

/** Query helper supporting both positional and object-form statements. */
export function q(stmt: InStatement): Promise<ResultSet>
export function q(sql: string, args?: unknown[]): Promise<ResultSet>
export function q(sqlOrStmt: string | InStatement, args?: unknown[]): Promise<ResultSet> {
  if (typeof sqlOrStmt === 'string') {
    return db.execute({ sql: sqlOrStmt, args: (args ?? []) as InValue[] })
  }
  return db.execute(sqlOrStmt)
}

/** Atomic batch helper. */
export function execBatch(statements: Array<{ sql: string; args: unknown[] }>, mode: 'write' | 'read' = 'write'): Promise<ResultSet[]> {
  return db.batch(statements as InStatement[], mode)
}

export type { Client, InStatement, ResultSet }