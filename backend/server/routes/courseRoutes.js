import { Router } from 'express'
import {
  createLecture,
  deleteLecture,
  reorderLecture,
  updateActiveLecture,
  updateLecture,
  updateLectureResources,
  updateModule,
} from '../controllers/adminController.js'
import {
  saveNotes,
  selectLecture,
  selectLectureById,
  showCourse,
  submitAssignment,
  updateProgress,
} from '../controllers/courseController.js'
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js'

const router = Router()

router.use(requireAuth)

router.get('/course', showCourse)
router.put('/progress/:moduleIndex/:lectureIndex', updateProgress)
router.put('/lectures/:id/select', selectLectureById)
router.put('/modules/:moduleIndex/lectures/:lectureIndex/select', selectLecture)
router.put('/notes', saveNotes)
router.post('/assignments/:id/submit', requireAdmin, submitAssignment)

router.put('/modules/:index', requireAdmin, updateModule)
router.put('/modules/:moduleIndex/lectures/:lectureIndex', requireAdmin, updateLecture)
router.put('/modules/:moduleIndex/lectures/:lectureIndex/resources', requireAdmin, updateLectureResources)
router.delete('/modules/:moduleIndex/lectures/:lectureIndex', requireAdmin, deleteLecture)
router.put('/lectures/reorder', requireAdmin, reorderLecture)
router.put('/lecture', requireAdmin, updateActiveLecture)
router.post('/lectures', requireAdmin, createLecture)

export default router
