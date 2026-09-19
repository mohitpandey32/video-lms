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
