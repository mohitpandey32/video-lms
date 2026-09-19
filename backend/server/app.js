import express from 'express'
import cors from 'cors'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import { collections, mongoClientPromise, mongoDbName } from './config/database.js'
import { errorHandler } from './middleware/errorMiddleware.js'
import authRoutes from './routes/authRoutes.js'
import courseRoutes from './routes/courseRoutes.js'

const app = express()
const production = process.env.NODE_ENV === 'production'
const sessionSecret = process.env.SESSION_SECRET || 'arcwell-local-session-change-in-production'
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean)

if (production && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required when NODE_ENV=production.')
}

if (production) app.set('trust proxy', 1)

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    const normalizedOrigin = origin?.replace(/\/+$/, '')
    if (!origin || allowedOrigins.includes(normalizedOrigin)) return callback(null, true)
    return callback(null, false)
  },
}))
app.use(express.json({ limit: '1mb' }))
app.use(session({
  name: 'arcwell.sid',
  secret: sessionSecret,
  store: MongoStore.create({
    clientPromise: mongoClientPromise,
    dbName: mongoDbName,
    collectionName: collections.sessions,
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: production ? 'none' : 'lax',
    secure: production,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}))

app.get('/', (_req, res) => res.json({ service: 'Arcwell API', status: 'ok' }))
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRoutes)
app.use('/api', courseRoutes)
app.use('/api', (_req, res) => res.status(404).json({ message: 'API endpoint not found.' }))

app.use(errorHandler)

export default app
