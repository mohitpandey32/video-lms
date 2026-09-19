import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { closeDatabase, collections, database } from '../server/config/database.js'

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

try {
  const seed = JSON.parse(await fs.readFile(path.join(backendRoot, 'server', 'data.json'), 'utf8'))
  const db = await database()
  const result = await db.collection(collections.courses).updateOne(
    { _id: 'main-course' },
    { $set: { course: seed.course } },
  )

  if (!result.matchedCount) {
    throw new Error('The main course does not exist. Run npm run migrate:mongo first.')
  }

  console.log(`Course metadata synchronized. Instructor: ${seed.course.instructor}`)
} finally {
  await closeDatabase()
}
