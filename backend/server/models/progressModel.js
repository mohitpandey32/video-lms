import { collections, database } from '../config/database.js'

async function progressCollection() {
  return (await database()).collection(collections.progress)
}

export async function getUserProgress(userId) {
  return (await progressCollection()).findOne({ userId }, { projection: { _id: 0 } })
}

export async function saveUserProgress(userId, completed) {
  const progress = { userId, completed, updatedAt: new Date().toISOString() }
  await (await progressCollection()).updateOne(
    { userId },
    { $set: progress },
    { upsert: true },
  )
  return progress
}

export async function savePlaybackPosition(userId, lectureId, seconds, duration) {
  const collection = await progressCollection()
  const updatedAt = new Date().toISOString()
  const field = `playbackPositions.${lectureId}`
  const update = seconds > 0
    ? { $set: { userId, [field]: { seconds, duration, updatedAt }, updatedAt } }
    : { $set: { userId, updatedAt }, $unset: { [field]: '' } }
  await collection.updateOne({ userId }, update, { upsert: true })
  return seconds > 0 ? { seconds, duration, updatedAt } : { seconds: 0, duration, updatedAt }
}

export async function removePlaybackPositionsForLecture(lectureId) {
  if (!lectureId) return
  await (await progressCollection()).updateMany(
    { [`playbackPositions.${lectureId}`]: { $exists: true } },
    { $unset: { [`playbackPositions.${lectureId}`]: '' } },
  )
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

export function remapCompletedLessonKeys(completed, keyMap) {
  return [...new Set((completed || []).map((key) => keyMap[key] || key))]
}

export async function remapProgressAfterLectureMove(keyMap) {
  const collection = await progressCollection()
  const records = await collection.find({ completed: { $exists: true } }).toArray()
  if (!records.length) return

  await collection.bulkWrite(records.map((record) => ({
    updateOne: {
      filter: { _id: record._id },
      update: {
        $set: {
          completed: remapCompletedLessonKeys(record.completed, keyMap),
          updatedAt: new Date().toISOString(),
        },
      },
    },
  })))
}
