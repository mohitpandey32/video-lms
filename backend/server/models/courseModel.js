import { randomUUID } from 'node:crypto'
import { collections, database } from '../config/database.js'

const courseId = 'main-course'

async function courseCollection() {
  return (await database()).collection(collections.courses)
}

export async function getCourse() {
  const data = await (await courseCollection()).findOne({ _id: courseId })
  if (!data) throw new Error('Course data has not been migrated to MongoDB.')
  const { _id, ...course } = data
  return course
}

export async function saveCourse(course) {
  await (await courseCollection()).replaceOne(
    { _id: courseId },
    { _id: courseId, ...course },
    { upsert: true },
  )
  return course
}

export async function ensureCourseLectureIds() {
  const collection = await courseCollection()
  const data = await collection.findOne({ _id: courseId })
  if (!data) return

  let changed = false
  let activeLecture = null
  data.modules?.forEach((module) => module.lessons?.forEach((lecture) => {
    if (!lecture.id) {
      lecture.id = `lecture-${randomUUID()}`
      changed = true
    }
    if (lecture.active) activeLecture = lecture
  }))

  if (activeLecture?.id && data.lecture?.id !== activeLecture.id) {
    data.lecture = { ...data.lecture, id: activeLecture.id }
    changed = true
  }

  if (changed) await collection.replaceOne({ _id: courseId }, data)
}
