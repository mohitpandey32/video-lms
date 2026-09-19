import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { createUser, findUserByEmail, findUserById } from '../models/userModel.js'

function publicUser(user) {
  return user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null
}

export async function getCurrentUser(req, res, next) {
  if (!req.session.userId) return res.json({ user: null })
  try {
    res.json({ user: publicUser(await findUserById(req.session.userId)) })
  } catch (error) {
    next(error)
  }
}

export async function signup(req, res, next) {
  const name = String(req.body.name || '').trim()
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')

  if (name.length < 2) return res.status(400).json({ message: 'Enter your full name.' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' })
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Use at least 8 characters for your password.' })
  }

  try {
    if (await findUserByEmail(email)) {
      return res.status(409).json({ message: 'An account already exists for this email.' })
    }

    const user = await createUser({
      id: randomUUID(),
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'student',
      createdAt: new Date().toISOString(),
    })
    req.session.userId = user.id
    res.status(201).json({ user: publicUser(user) })
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'An account already exists for this email.' })
    }
    next(error)
  }
}

export async function login(req, res, next) {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')

  try {
    const user = await findUserByEmail(email)
    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      return res.status(401).json({ message: 'Email or password is incorrect.' })
    }
    req.session.userId = user.id
    res.json({ user: publicUser(user) })
  } catch (error) {
    next(error)
  }
}

export function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('arcwell.sid', {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    res.status(204).end()
  })
}
