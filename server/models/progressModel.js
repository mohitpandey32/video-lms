import { collections, database } from '../config/database.js'

async function progressCollection() {
  return (await database()).collection(collections.progress)
}

export async function getUserProgress(userId) {
  return (await progressCollection()).findOne({ userId }, { projection: { _id: 0 } })
}

export async function saveUserProgress(userId, completed) {
  const progress = { userId, completed, updatedAt: new Date().toISOString() }
  await (await progressCollection()).replaceOne({ userId }, progress, { upsert: true })
  return progress
}
