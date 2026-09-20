import { getCourse, saveCourse } from '../models/courseModel.js'
import { randomUUID } from 'node:crypto'
import { reindexProgressAfterLectureDelete, remapProgressAfterLectureMove, removePlaybackPositionsForLecture, removeVideoNotesForLecture } from '../models/progressModel.js'
import { applyUserProgress } from '../services/courseService.js'
import { driveEmbedUrl, isValidWebUrl } from '../utils/url.js'

function synchronizeActiveLecture(course) {
  let selectedModuleIndex = -1
  let selectedLectureIndex = -1

  course.modules.some((module, moduleIndex) => {
    const lectureIndex = module.lessons.findIndex((lesson) => lesson.active)
    if (lectureIndex < 0) return false
    selectedModuleIndex = moduleIndex
    selectedLectureIndex = lectureIndex
    return true
  })

  if (selectedModuleIndex < 0) {
    selectedModuleIndex = course.modules.findIndex((module) => module.lessons.length)
    selectedLectureIndex = 0
  }

  course.modules.forEach((module) => module.lessons.forEach((lesson) => { lesson.active = false }))
  const module = course.modules[selectedModuleIndex]
  const lecture = module.lessons[selectedLectureIndex]
  lecture.active = true
  const previousLessons = course.modules.slice(0, selectedModuleIndex)
    .reduce((total, item) => total + item.lessons.length, 0)
  course.lecture = {
    ...lecture,
    number: String(previousLessons + selectedLectureIndex + 1).padStart(2, '0'),
    moduleTitle: module.title,
    videoUrl: lecture.videoUrl || '',
    embedUrl: lecture.embedUrl || '',
    classNotesUrl: lecture.classNotesUrl || '',
    assignmentPdfUrl: lecture.assignmentPdfUrl || '',
    githubRepoUrl: lecture.githubRepoUrl || '',
  }
}

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

export async function deleteLecture(req, res) {
  const moduleIndex = Number(req.params.moduleIndex)
  const lectureIndex = Number(req.params.lectureIndex)

  try {
    const course = await getCourse()
    const module = course.modules[moduleIndex]
    const lecture = module?.lessons?.[lectureIndex]
    if (!Number.isInteger(moduleIndex) || !Number.isInteger(lectureIndex) || !lecture) {
      return res.status(404).json({ message: 'Lecture not found.' })
    }

    const lectureCount = course.modules.reduce((total, item) => total + item.lessons.length, 0)
    if (lectureCount <= 1) {
      return res.status(400).json({ message: 'The course must contain at least one lecture.' })
    }

    module.lessons.splice(lectureIndex, 1)
    synchronizeActiveLecture(course)
    await saveCourse(course)
    await reindexProgressAfterLectureDelete(moduleIndex, lectureIndex)
    await removePlaybackPositionsForLecture(lecture.id)
    await removeVideoNotesForLecture(lecture.id)
    res.json(await applyUserProgress(course, req.user.id))
  } catch (error) {
    console.error('Could not delete lecture:', error)
    res.status(500).json({ message: 'Could not delete the lecture.' })
  }
}

export async function reorderLecture(req, res) {
  const fromModuleIndex = Number(req.body.fromModuleIndex)
  const fromLectureIndex = Number(req.body.fromLectureIndex)
  const toModuleIndex = Number(req.body.toModuleIndex)
  const toLectureIndex = Number(req.body.toLectureIndex)

  try {
    const course = await getCourse()
    const sourceModule = course.modules[fromModuleIndex]
    const targetModule = course.modules[toModuleIndex]
    const indicesAreValid = [fromModuleIndex, fromLectureIndex, toModuleIndex, toLectureIndex]
      .every(Number.isInteger)

    if (!indicesAreValid || !sourceModule?.lessons?.[fromLectureIndex] || !targetModule
      || toLectureIndex < 0 || toLectureIndex > targetModule.lessons.length) {
      return res.status(400).json({ message: 'Choose a valid lecture position.' })
    }

    const previousKeysById = new Map()
    course.modules.forEach((module, moduleIndex) => module.lessons.forEach((lecture, lectureIndex) => {
      if (!lecture.id) lecture.id = `lecture-${randomUUID()}`
      previousKeysById.set(lecture.id, `${moduleIndex}:${lectureIndex}`)
    }))

    const [lecture] = sourceModule.lessons.splice(fromLectureIndex, 1)
    const insertionIndex = fromModuleIndex === toModuleIndex && fromLectureIndex < toLectureIndex
      ? toLectureIndex - 1
      : toLectureIndex
    targetModule.lessons.splice(insertionIndex, 0, lecture)

    synchronizeActiveLecture(course)
    const keyMap = {}
    course.modules.forEach((module, moduleIndex) => module.lessons.forEach((item, lectureIndex) => {
      keyMap[previousKeysById.get(item.id)] = `${moduleIndex}:${lectureIndex}`
    }))

    await saveCourse(course)
    await remapProgressAfterLectureMove(keyMap)
    res.json(await applyUserProgress(course, req.user.id))
  } catch (error) {
    console.error('Could not reorder lecture:', error)
    res.status(500).json({ message: 'Could not move the lecture.' })
  }
}

export async function updateLectureResources(req, res) {
  const moduleIndex = Number(req.params.moduleIndex)
  const lectureIndex = Number(req.params.lectureIndex)
  const videoUrl = String(req.body.videoUrl || '').trim()
  const classNotesUrl = String(req.body.classNotesUrl || '').trim()
  const assignmentPdfUrl = String(req.body.assignmentPdfUrl || '').trim()
  const githubRepoUrl = String(req.body.githubRepoUrl || '').trim()
  if (![videoUrl, classNotesUrl, assignmentPdfUrl, githubRepoUrl].every(isValidWebUrl)) {
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
      githubRepoUrl,
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
  const { title, moduleIndex, duration, videoUrl, classNotesUrl = '', assignmentPdfUrl = '', githubRepoUrl = '' } = req.body
  const targetModule = Number(moduleIndex)
  if (!title?.trim() || !videoUrl?.trim() || !duration?.trim()) {
    return res.status(400).json({ message: 'Title, duration, and a public video URL are required.' })
  }

  try {
    if (![videoUrl, classNotesUrl, assignmentPdfUrl, githubRepoUrl].every(isValidWebUrl)) {
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
      githubRepoUrl: String(githubRepoUrl).trim(),
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
