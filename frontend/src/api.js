const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
const apiBaseUrl = configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:4000' : '')

async function request(path, options = {}) {
  if (!apiBaseUrl) {
    throw new Error('VITE_API_URL is not configured for this frontend deployment.')
  }

  let response

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('The Arcwell API could not be reached. Check VITE_API_URL and the backend deployment.')
  }

  const text = await response.text()
  let result = null

  if (text) {
    try {
      result = JSON.parse(text)
    } catch {
      throw new Error(`The API returned an invalid response (${response.status}). Check the backend URL and runtime logs.`)
    }
  }

  if (!response.ok) {
    throw new Error(result?.message || `The API request failed (${response.status}).`)
  }

  return result
}

const json = (payload) => JSON.stringify(payload)

export const api = {
  me: () => request('/api/auth/me'),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: json(payload) }),
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: json(payload) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  getCourse: () => request('/api/course'),
  updateLecture: (payload) => request('/api/lecture', { method: 'PUT', body: json(payload) }),
  createLecture: (payload) => request('/api/lectures', { method: 'POST', body: json(payload) }),
  selectLecture: (moduleIndex, lectureIndex) => request(
    `/api/modules/${moduleIndex}/lectures/${lectureIndex}/select`,
    { method: 'PUT' },
  ),
  updateModule: (index, title) => request(`/api/modules/${index}`, {
    method: 'PUT',
    body: json({ title }),
  }),
  updateLectureName: (moduleIndex, lectureIndex, title) => request(
    `/api/modules/${moduleIndex}/lectures/${lectureIndex}`,
    { method: 'PUT', body: json({ title }) },
  ),
  updateLectureResources: (moduleIndex, lectureIndex, payload) => request(
    `/api/modules/${moduleIndex}/lectures/${lectureIndex}/resources`,
    { method: 'PUT', body: json(payload) },
  ),
  deleteLecture: (moduleIndex, lectureIndex) => request(
    `/api/modules/${moduleIndex}/lectures/${lectureIndex}`,
    { method: 'DELETE' },
  ),
  updateProgress: (moduleIndex, lectureIndex, completed) => request(
    `/api/progress/${moduleIndex}/${lectureIndex}`,
    { method: 'PUT', body: json({ completed }) },
  ),
}
