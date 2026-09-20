import { loadEnv, env } from './config/env'
import { q } from './lib/turso'
import { logger } from './lib/logger'
import app from './app'

loadEnv()

async function boot(): Promise<void> {
  // Quick connectivity check so we fail fast with a clear message.
  try {
    await q('SELECT 1 AS ok')
  } catch (err) {
    logger.error('Could not connect to the database. Check TURSO_DATABASE_URL / TURSO_AUTH_TOKEN.', {
      message: (err as { message?: string }).message,
    })
    process.exit(1)
  }
  app.listen(env.port, () => {
    logger.info(`Laundry API listening on http://localhost:${env.port}`)
  })
}

void boot()

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) })
})