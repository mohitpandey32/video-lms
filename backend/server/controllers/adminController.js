import { getCourse, saveCourse } from '../models/courseModel.js'
import { applyUserProgress } from '../services/courseService.js'
import { driveEmbedUrl, isValidWebUrl } from '../utils/url.js'

export async function updateModule(req, res) {
  const moduleIndex = Number(req.params.index)
  const title = String(req.body.title || '').trim()
  if (!title) return res.status(400).json({ message: 'Enter a module name.' })
  if (title.length > 80) {
    return res.status(400).json({ message: 'Module names must be 80 characters or fewer.' })
  }

  try {
    const course = await getCourse()
    if (!Number.isInteger(moduleIndex) || !course.modules[moduleIndex]) {
      return res.status(404).json({ message: 'Module not found.' })
    }
    course.modules[moduleIndex].title = title
    await saveCourse(course)
    res.json(await applyUserProgress(course, req.user.id))
  } catch {
    res.status(500).json({ message: 'Could not update the module.' })
  }
}

export async function updateLecture(req, res) {
  const moduleIndex = Number(req.params.moduleIndex)
  const lectureIndex = Number(req.params.lectureIndex)
  const title = String(req.body.title || '').trim()
  if (!title) return res.status(400).json({ message: 'Enter a lecture name.' })
  if (title.length > 120) {
    return res.status(400).json({ message: 'Lecture names must be 120 characters or fewer.' })
  }

  try {
    const course = await getCourse()
    const lecture = course.modules[moduleIndex]?.lessons?.[lectureIndex]
    if (!lecture) return res.status(404).json({ message: 'Lecture not found.' })
    const previousTitle = lecture.title
    lecture.title = title
    if (lecture.active || (lecture.id && lecture.id === course.lecture.id) || course.lecture.title === previousTitle) {
      course.lecture.title = title
    }
    await saveCourse(course)
    res.json(await applyUserProgress(course, req.user.id))
  } catch {
    res.status(500).json({ message: 'Could not update the lecture.' })
  }
}

export async function updateLectureResources(req, res) {
  const moduleIndex = Number(req.params.moduleIndex)
  const lectureIndex = Number(req.params.lectureIndex)
  const videoUrl = String(req.body.videoUrl || '').trim()
  const classNotesUrl = String(req.body.classNotesUrl || '').trim()
  const assignmentPdfUrl = String(req.body.assignmentPdfUrl || '').trim()
  if (![videoUrl, classNotesUrl, assignmentPdfUrl].every(isValidWebUrl)) {
    return res.status(400).json({ message: 'Use valid public HTTP or HTTPS links for all resources.' })
  }

  try {
    const course = await getCourse()
    const lecture = course.modules[moduleIndex]?.lessons?.[lectureIndex]
    if (!lecture) return res.status(404).json({ message: 'Lecture not found.' })
    Object.assign(lecture, {
      videoUrl,
      embedUrl: videoUrl ? driveEmbedUrl(videoUrl) : '',
      classNotesUrl,
      assignmentPdfUrl,
    })
    if (lecture.active || (lecture.id && lecture.id === course.lecture.id)) {
      course.lecture = { ...course.lecture, ...lecture }
    }
    await saveCourse(course)
    res.json(await applyUserProgress(course, req.user.id))
  } catch {
    res.status(500).json({ message: 'Could not update lecture resources.' })
  }
}

export async function updateActiveLecture(req, res) {
  const { title, videoUrl } = req.body
  if (!title?.trim() || !videoUrl?.trim()) {
    return res.status(400).json({ message: 'A lecture title and public video URL are required.' })
  }

  try {
    if (!isValidWebUrl(videoUrl)) throw new Error('invalid URL')
    const course = await getCourse()
    course.lecture = {
      ...course.lecture,
      title: title.trim(),
      videoUrl: videoUrl.trim(),
      embedUrl: driveEmbedUrl(videoUrl.trim()),
    }
    if (course.lecture.id) {
      course.modules.forEach((module) => module.lessons.forEach((lesson) => {
        if (lesson.id === course.lecture.id) Object.assign(lesson, course.lecture)
      }))
    }
    await saveCourse(course)
    res.json(course.lecture)
  } catch {
    res.status(400).json({ message: 'Please enter a valid public URL.' })
  }
}

export async function createLecture(req, res) {
  const { title, moduleIndex, duration, videoUrl, classNotesUrl = '', assignmentPdfUrl = '' } = req.body
  const targetModule = Number(moduleIndex)
  if (!title?.trim() || !videoUrl?.trim() || !duration?.trim()) {
    return res.status(400).json({ message: 'Title, duration, and a public video URL are required.' })
  }

  try {
    if (![videoUrl, classNotesUrl, assignmentPdfUrl].every(isValidWebUrl)) {
      throw new Error('invalid URL')
    }
    const course = await getCourse()
    if (!Number.isInteger(targetModule) || !course.modules[targetModule]) {
      return res.status(400).json({ message: 'Choose a valid course module.' })
    }

    course.modules.forEach((module) => module.lessons.forEach((lesson) => { lesson.active = false }))
    const lessonCount = course.modules.reduce((total, module) => total + module.lessons.length, 0)
    const lecture = {
      id: `lecture-${Date.now()}`,
      title: title.trim(),
      number: String(lessonCount + 1).padStart(2, '0'),
      duration: duration.trim(),
      videoUrl: videoUrl.trim(),
      embedUrl: driveEmbedUrl(videoUrl.trim()),
      classNotesUrl: String(classNotesUrl).trim(),
      assignmentPdfUrl: String(assignmentPdfUrl).trim(),
      active: true,
      done: false,
    }
    course.modules[targetModule].lessons.push(lecture)
    course.lecture = lecture
    await saveCourse(course)
    res.status(201).json(await applyUserProgress(course, req.user.id))
  } catch {
    res.status(400).json({ message: 'Please enter valid public resource URLs.' })
  }
}
