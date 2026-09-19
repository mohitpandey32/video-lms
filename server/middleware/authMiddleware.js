import { findUserById } from '../models/userModel.js'

export async function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ message: 'Sign in to continue.' })

  try {
    const user = await findUserById(req.session.userId)
    if (!user) return res.status(401).json({ message: 'Your session is no longer valid.' })
    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Administrator access is required.' })
  }
  next()
}
