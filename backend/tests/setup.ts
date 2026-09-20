import { rmSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Point the whole backend at a throwaway test database.
const here = path.dirname(fileURLToPath(import.meta.url))
const dbDir = path.resolve(here, '../data')
const dbPath = path.join(dbDir, 'test.db')
mkdirSync(dbDir, { recursive: true })
for (const suffix of ['', '-wal', '-shm']) {
  try {
    rmSync(dbPath + suffix, { force: true })
  } catch {
    // best effort
  }
}

process.env.TURSO_DATABASE_URL = 'file:' + dbPath
process.env.JWT_SECRET = 'test-secret-for-vitest'
process.env.NODE_ENV = 'test'
process.env.FRONTEND_URL = 'http://localhost:5173'