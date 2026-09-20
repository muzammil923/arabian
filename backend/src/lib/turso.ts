import { createClient as createHttpClient } from '@libsql/client/http'
import type { Client, InStatement, InValue, ResultSet } from '@libsql/client/http'
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import { loadEnv, env } from '../config/env'

// Lazy-load the native node client only for local file: databases (dev/tests).
// Vercel/serverless bundles keep the pure-JS HTTP client, so no native
// bindings ever need to load in Lambda.
// The native node client is needed only for local file: databases. The module
// specifier is assembled at runtime from a reversed literal so that neither
// esbuild (esbuild: true) nor @vercel/nft can statically trace it into the
// serverless bundle — the native bindings can never ship or load in Lambda.
const nodeRequire = createRequire(__filename)
const NODE_CLIENT_SPEC_REV = 'tnelirc/qsli@' // reversed: '@libsql/client'
function reverse(s: string): string {
  return s.split('').reverse().join('')
}
function createNodeClient(url: string, authToken?: string): Client {
  const spec = reverse(NODE_CLIENT_SPEC_REV)
  return nodeRequire(spec).createClient({ url, authToken: authToken || undefined }) as Client
}

export function createDb(url: string, authToken?: string): Client {
  const httpUrl = url.startsWith('libsql://') ? `https://${url.slice('libsql://'.length)}` : url
  const remote =
    httpUrl.startsWith('https://') ||
    httpUrl.startsWith('http://') ||
    url.startsWith('libsql://')
  if (remote) {
    return createHttpClient({ url: httpUrl, authToken: authToken || undefined })
  }
  // file: URL — local/dev only.
  const filePath = url.replace('file:', '')
  const dir = path.dirname(filePath)
  if (dir && dir !== '.') {
    try {
      fs.mkdirSync(dir, { recursive: true })
    } catch {
      // Read-only filesystems (e.g. Vercel serverless) can't create DB files.
    }
  }
  const db = createNodeClient(url, authToken)
  // Best-effort FK enforcement for local databases.
  void db.execute({ sql: 'PRAGMA foreign_keys = ON', args: [] }).catch(() => undefined)
  return db
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
      console.warn(
        '[turso] TURSO_DATABASE_URL is a local file on Vercel. Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (Turso cloud) or most API calls will fail.',
      )
    }
  }
  return createDb(url, env.tursoAuthToken)
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
