const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug'

function ts(): string {
  return new Date().toISOString()
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(`[${ts()}] INFO ${message}`, meta ? JSON.stringify(meta) : '')
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[${ts()}] WARN ${message}`, meta ? JSON.stringify(meta) : '')
  },
  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`[${ts()}] ERROR ${message}`, meta ? JSON.stringify(meta) : '')
  },
  debug(message: string, meta?: Record<string, unknown>): void {
    if (level === 'debug') console.log(`[${ts()}] DEBUG ${message}`, meta ? JSON.stringify(meta) : '')
  },
}