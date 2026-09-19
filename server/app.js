import express from 'express'
import cors from 'cors'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { collections, mongoClientPromise, mongoDbName } from './config/database.js'
import { errorHandler } from './middleware/errorMiddleware.js'
import authRoutes from './routes/authRoutes.js'
import courseRoutes from './routes/courseRoutes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(session({
  name: 'arcwell.sid',
  secret: process.env.SESSION_SECRET || 'arcwell-local-session-change-in-production',
  store: MongoStore.create({
    clientPromise: mongoClientPromise,
    dbName: mongoDbName,
    collectionName: collections.sessions,
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}))

app.use('/api/auth', authRoutes)
app.use('/api', courseRoutes)

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.use(errorHandler)

export default app
