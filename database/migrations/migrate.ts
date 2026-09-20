import { promises as fs } from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { db, q } from '../../backend/src/lib/turso'

const MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
)`

export async function migrate(): Promise<void> {
  await q('PRAGMA foreign_keys = ON')
  await q(MIGRATIONS_TABLE)

  const dir = path.join(__dirname)
  const files = (await fs.readdir(dir))
    .filter((f) => f.endsWith('.sql') && /^\d+_/.test(f))
    .sort()

  const appliedRows = await q('SELECT filename FROM schema_migrations')
  const applied = new Set(appliedRows.rows.map((r) => String((r as { filename: unknown }).filename)))

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = await fs.readFile(path.join(dir, file), 'utf8')
    await db.executeMultiple(sql)
    await q({ sql: 'INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)', args: [file, new Date().toISOString()] })
    console.log(`[migrate] applied ${file}`)
  }
  console.log('[migrate] migrations up to date.')
}

const isMain = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  migrate().catch((err) => {
    console.error('[migrate] failed:', err)
    process.exit(1)
  })
}