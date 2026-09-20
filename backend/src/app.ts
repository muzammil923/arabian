import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env'
import { rateLimit } from './middleware/rateLimit'
import { errorHandler, notFoundHandler } from './middleware/errors'
import { logger } from './lib/logger'
import routes from './routes'

const app = express()

app.set('trust proxy', 1)

app.use(helmet())
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  }),
)
app.use(cookieParser())
app.use(express.json({ limit: '1mb' }))
app.use(rateLimit())

app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`, { ip: req.ip })
  next()
})

app.use(routes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app