import { getUserProgress } from '../models/progressModel.js'

export function lessonKey(moduleIndex, lectureIndex) {
  return `${moduleIndex}:${lectureIndex}`
}

export function getProgressSummary(course, completed) {
  const completedSet = completed instanceof Set ? completed : new Set(completed)
  const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0)
  const completedLessons = course.modules.reduce(
    (sum, module, moduleIndex) => sum + module.lessons.filter(
      (_lesson, lectureIndex) => completedSet.has(lessonKey(moduleIndex, lectureIndex)),
    ).length,
    0,
  )

  return {
    completedLessons,
    totalLessons,
    progress: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
  }
}

export async function applyUserProgress(course, userId) {
  const progress = await getUserProgress(userId)
  const completed = new Set(progress?.completed || [])
  const playbackPositions = progress?.playbackPositions || {}

  course.modules.forEach((module, moduleIndex) => module.lessons.forEach((lesson, lectureIndex) => {
    lesson.done = completed.has(lessonKey(moduleIndex, lectureIndex))
    const playback = playbackPositions[lesson.id]
    lesson.resumeAt = Number(playback?.seconds) || 0
    lesson.resumeUpdatedAt = playback?.updatedAt || null
  }))

  const activePlayback = playbackPositions[course.lecture?.id]
  if (course.lecture) {
    course.lecture.resumeAt = Number(activePlayback?.seconds) || 0
    course.lecture.resumeUpdatedAt = activePlayback?.updatedAt || null
  }

  Object.assign(course.course, getProgressSummary(course, completed))
  return course
}
