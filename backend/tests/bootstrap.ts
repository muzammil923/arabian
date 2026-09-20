// Ensures the schema and demo data exist for the test worker.
// Vitest ISOLATES each test file into its own module graph, so importing this
// file (with setup.ts deleting test.db first) guarantees a fresh database per
// integration suite.
import { migrate } from '../../database/migrations/migrate'
import { seed } from '../../database/seeds/seed'

await migrate()
await seed()

export {}
