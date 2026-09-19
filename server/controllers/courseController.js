import { getCourse, saveCourse } from '../models/courseModel.js'
import { getUserProgress, saveUserProgress } from '../models/progressModel.js'
import { applyUserProgress, getProgressSummary, lessonKey } from '../services/courseService.js'

export async function showCourse(req, res) {
  try {
    res.json(await applyUserProgress(await getCourse(), req.user.id))
  } catch {
    res.status(500).json({ message: 'Unable to load course data.' })
  }
}

export async function updateProgress(req, res) {
  const moduleIndex = Number(req.params.moduleIndex)
  const lectureIndex = Number(req.params.lectureIndex)
  const completedValue = req.body.completed !== false

  try {
    const course = await getCourse()
    if (!course.modules[moduleIndex]?.lessons?.[lectureIndex]) {
      return res.status(404).json({ message: 'Lecture not found.' })
    }

    const userProgress = await getUserProgress(req.user.id)
    const completed = new Set(userProgress?.completed || [])
    const key = lessonKey(moduleIndex, lectureIndex)
    completedValue ? completed.add(key) : completed.delete(key)
    await saveUserProgress(req.user.id, [...completed])

    res.json({ completed: completedValue, ...getProgressSummary(course, completed) })
  } catch {
    res.status(500).json({ message: 'Could not update course progress.' })
  }
}

export async function selectLectureById(req, res) {
  try {
    const course = await getCourse()
    let selected
    course.modules.forEach((module) => module.lessons.forEach((lesson) => {
      lesson.active = lesson.id === req.params.id
      if (lesson.active) selected = lesson
    }))
    if (!selected?.videoUrl) {
      return res.status(404).json({ message: 'This lecture does not have a video yet.' })
    }
    course.lecture = { ...selected }
    await saveCourse(course)
    res.json(await applyUserProgress(course, req.user.id))
  } catch {
    res.status(500).json({ message: 'Could not open this lecture.' })
  }
}

export async function selectLecture(req, res) {
  const moduleIndex = Number(req.params.moduleIndex)
  const lectureIndex = Number(req.params.lectureIndex)

  try {
    const course = await getCourse()
    const module = course.modules[moduleIndex]
    const selected = module?.lessons?.[lectureIndex]
    if (!selected) return res.status(404).json({ message: 'Lecture not found.' })

    course.modules.forEach((item) => item.lessons.forEach((lesson) => { lesson.active = false }))
    selected.active = true
    const previousLessons = course.modules.slice(0, moduleIndex)
      .reduce((total, item) => total + item.lessons.length, 0)
    course.lecture = {
      ...selected,
      number: String(previousLessons + lectureIndex + 1).padStart(2, '0'),
      moduleTitle: module.title,
      videoUrl: selected.videoUrl || '',
      embedUrl: selected.embedUrl || '',
      classNotesUrl: selected.classNotesUrl || '',
      assignmentPdfUrl: selected.assignmentPdfUrl || '',
    }
    await saveCourse(course)
    res.json(await applyUserProgress(course, req.user.id))
  } catch {
    res.status(500).json({ message: 'Could not open this lecture.' })
  }
}

export async function saveNotes(req, res) {
  try {
    const course = await getCourse()
    course.notes = String(req.body.notes || '').slice(0, 20000)
    await saveCourse(course)
    res.json({ notes: course.notes, savedAt: new Date().toISOString() })
  } catch {
    res.status(500).json({ message: 'Could not save notes.' })
  }
}

export async function submitAssignment(req, res) {
  const { response } = req.body
  if (!response?.trim()) {
    return res.status(400).json({ message: 'Add a response or submission link first.' })
  }

  try {
    const course = await getCourse()
    const assignment = course.assignments.find((item) => item.id === req.params.id)
    if (!assignment) return res.status(404).json({ message: 'Assignment not found.' })
    assignment.status = 'submitted'
    assignment.submission = response.trim()
    assignment.submittedAt = new Date().toISOString()
    await saveCourse(course)
    res.json(assignment)
  } catch {
    res.status(500).json({ message: 'Could not submit assignment.' })
  }
}
