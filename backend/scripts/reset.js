const fs = require('fs')
const path = require('path')

const dataDir = path.join(__dirname, '..', 'data')
if (fs.existsSync(dataDir)) {
  for (const f of fs.readdirSync(dataDir)) {
    if (f.endsWith('.db') || f.endsWith('.db-journal') || f.endsWith('.db-shm') || f.endsWith('.db-wal')) {
      fs.rmSync(path.join(dataDir, f), { force: true })
    }
  }
  console.log('[reset] removed local database files in backend/data')
} else {
  console.log('[reset] no local database found (running against remote Turso?)')
}