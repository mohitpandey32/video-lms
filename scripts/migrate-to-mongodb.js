import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  closeDatabase,
  collections,
  database,
  ensureDatabaseIndexes,
} from '../server/config/database.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const readJson = async (filename) => JSON.parse(
  await fs.readFile(path.join(projectRoot, 'server', filename), 'utf8'),
)

try {
  const [course, users, progressByUser] = await Promise.all([
    readJson('data.json'),
    readJson('users.json'),
    readJson('progress.json'),
  ])
  const db = await database()
  await ensureDatabaseIndexes()

  await db.collection(collections.courses).replaceOne(
    { _id: 'main-course' },
    { _id: 'main-course', ...course },
    { upsert: true },
  )

  if (users.length) {
    await db.collection(collections.users).bulkWrite(users.map((user) => ({
      replaceOne: {
        filter: { email: user.email.toLowerCase() },
        replacement: { ...user, email: user.email.toLowerCase() },
        upsert: true,
      },
    })))
  }

  const progressEntries = Object.entries(progressByUser)
  if (progressEntries.length) {
    await db.collection(collections.progress).bulkWrite(progressEntries.map(([userId, value]) => ({
      replaceOne: {
        filter: { userId },
        replacement: { userId, ...value },
        upsert: true,
      },
    })))
  }

  const lectureCount = course.modules.reduce((total, module) => total + module.lessons.length, 0)
  console.log(`Migration complete: 1 course, ${course.modules.length} modules, ${lectureCount} lectures, ${users.length} users, ${progressEntries.length} progress records.`)
} finally {
  await closeDatabase()
}
