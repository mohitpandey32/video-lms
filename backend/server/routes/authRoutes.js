import { Router } from 'express'
import { getCurrentUser, login, logout, signup } from '../controllers/authController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/me', getCurrentUser)
router.post('/signup', signup)
router.post('/login', login)
router.post('/logout', requireAuth, logout)

export default router
