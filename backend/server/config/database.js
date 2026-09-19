import 'dotenv/config'
import { MongoClient } from 'mongodb'

const mongoUri = process.env.MONGODB_URI
export const mongoDbName = process.env.MONGODB_DB || 'corebase'

if (!mongoUri) {
  throw new Error('MONGODB_URI is required. Add it to your environment before starting Arcwell.')
}

export const collections = {
  courses: 'lms_courses',
  users: 'lms_users',
  progress: 'lms_progress',
  sessions: 'lms_sessions',
}

const mongoClient = new MongoClient(mongoUri)
export const mongoClientPromise = mongoClient.connect()

export async function database() {
  await mongoClientPromise
  return mongoClient.db(mongoDbName)
}

export async function ensureDatabaseIndexes() {
  const db = await database()
  await Promise.all([
    db.collection(collections.users).createIndex({ email: 1 }, { unique: true }),
    db.collection(collections.users).createIndex({ id: 1 }, { unique: true }),
    db.collection(collections.progress).createIndex({ userId: 1 }, { unique: true }),
  ])
}

export async function closeDatabase() {
  await mongoClient.close()
}
