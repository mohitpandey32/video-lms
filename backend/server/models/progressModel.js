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

export function reindexCompletedLessonKeys(completed, deletedModuleIndex, deletedLectureIndex) {
  return [...new Set((completed || []).flatMap((key) => {
    const match = /^(\d+):(\d+)$/.exec(key)
    if (!match) return [key]

    const moduleIndex = Number(match[1])
    const lectureIndex = Number(match[2])
    if (moduleIndex !== deletedModuleIndex) return [key]
    if (lectureIndex === deletedLectureIndex) return []
    if (lectureIndex > deletedLectureIndex) return [`${moduleIndex}:${lectureIndex - 1}`]
    return [key]
  }))]
}

export async function reindexProgressAfterLectureDelete(moduleIndex, lectureIndex) {
  const collection = await progressCollection()
  const records = await collection.find({ completed: { $exists: true } }).toArray()
  if (!records.length) return

  await collection.bulkWrite(records.map((record) => ({
    updateOne: {
      filter: { _id: record._id },
      update: {
        $set: {
          completed: reindexCompletedLessonKeys(record.completed, moduleIndex, lectureIndex),
          updatedAt: new Date().toISOString(),
        },
      },
    },
  })))
}
