import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, BookOpen, Check, ChevronDown, ChevronRight, Circle,
  ClipboardList, ExternalLink, Eye, FileText, Gauge, GraduationCap, LayoutList,
  Link2, List, LockKeyhole, LogOut, Mail, Maximize, Menu, Pause, PencilLine,
  Play, Plus, Settings2, ShieldCheck, SkipBack, SkipForward, Upload, UserRound,
  VideoOff, Volume2, VolumeX, X,
} from 'lucide-react'

const api = {
  async me() {
    const response = await fetch('/api/auth/me')
    if (!response.ok) throw new Error('Authentication is unavailable.')
    return response.json()
  },
  async login(payload) {
    const response = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message)
    return result
  },
  async signup(payload) {
    const response = await fetch('/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message)
    return result
  },
  async logout() {
    const response = await fetch('/api/auth/logout', { method: 'POST' })
    if (!response.ok) throw new Error('Could not sign out.')
  },
  async getCourse() {
    const response = await fetch('/api/course')
    if (!response.ok) throw new Error('Course data is unavailable.')
    return response.json()
  },
  async saveNotes(notes) {
    const response = await fetch('/api/notes', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }),
    })
    if (!response.ok) throw new Error('Notes could not be saved.')
    return response.json()
  },
  async updateLecture(payload) {
    const response = await fetch('/api/lecture', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message)
    return result
  },
  async createLecture(payload) {
    const response = await fetch('/api/lectures', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message)
    return result
  },
  async selectLecture(moduleIndex, lectureIndex) {
    const response = await fetch(`/api/modules/${moduleIndex}/lectures/${lectureIndex}/select`, { method: 'PUT' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message)
    return result
  },
  async updateModule(index, title) {
    const response = await fetch(`/api/modules/${index}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message)
    return result
  },
  async updateLectureName(moduleIndex, lectureIndex, title) {
    const response = await fetch(`/api/modules/${moduleIndex}/lectures/${lectureIndex}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message)
    return result
  },
  async updateLectureResources(moduleIndex, lectureIndex, payload) {
    const response = await fetch(`/api/modules/${moduleIndex}/lectures/${lectureIndex}/resources`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message)
    return result
  },
  async updateProgress(moduleIndex, lectureIndex, completed) {
    const response = await fetch(`/api/progress/${moduleIndex}/${lectureIndex}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message)
    return result
  },
  async submitAssignment(id, responseText) {
    const response = await fetch(`/api/assignments/${id}/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response: responseText }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message)
    return result
  },
}

function formatTime(value) {
  if (!Number.isFinite(value)) return '0:00'
  const minutes = Math.floor(value / 60)
  return `${minutes}:${String(Math.floor(value % 60)).padStart(2, '0')}`
}

function isDriveUrl(url = '') {
  return url.includes('drive.google.com')
}

function Player({ lecture, onComplete }) {
  const videoRef = useRef(null)
  const playerRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [speed, setSpeed] = useState(1)
  const [showSpeed, setShowSpeed] = useState(false)
  const drive = isDriveUrl(lecture.videoUrl)

  useEffect(() => {
    setPlaying(false); setCurrent(0); setDuration(0)
  }, [lecture.videoUrl])

  const toggle = () => {
    const video = videoRef.current
    if (!video) return
    video.paused ? video.play() : video.pause()
  }

  const jump = (amount) => {
    if (videoRef.current) videoRef.current.currentTime += amount
  }

  const changeVolume = (next) => {
    setVolume(next)
    if (videoRef.current) videoRef.current.volume = next
  }

  const changeSpeed = (next) => {
    setSpeed(next); setShowSpeed(false)
    if (videoRef.current) videoRef.current.playbackRate = next
  }

  if (!lecture.videoUrl) {
    return <div className="player player--empty"><span><VideoOff /></span><div><b>Video not published yet</b><p>You can still review the available lesson resources.</p></div></div>
  }

  if (drive) {
    return (
      <div className="player player--embed">
        <iframe src={lecture.embedUrl} title={lecture.title} allow="autoplay; fullscreen" allowFullScreen />
        <div className="embed-note"><span>Google Drive preview</span><span>Playback controls are provided by Drive</span></div>
      </div>
    )
  }

  return (
    <div className="player" ref={playerRef} onDoubleClick={() => playerRef.current?.requestFullscreen()}>
      <video
        ref={videoRef} src={lecture.embedUrl || lecture.videoUrl} preload="metadata"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onEnded={() => { setPlaying(false); onComplete?.() }}
      />
      <button className="center-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
      </button>
      <div className="controls">
        <input className="timeline" type="range" min="0" max={duration || 0} value={current} step="0.1"
          style={{ '--played': `${duration ? (current / duration) * 100 : 0}%` }}
          onChange={(event) => { const next = Number(event.target.value); videoRef.current.currentTime = next; setCurrent(next) }} />
        <div className="control-row">
          <div className="control-cluster">
            <button onClick={() => jump(-10)} aria-label="Back 10 seconds"><SkipBack /></button>
            <button className="play-small" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</button>
            <button onClick={() => jump(10)} aria-label="Forward 10 seconds"><SkipForward /></button>
            <button onClick={() => changeVolume(volume ? 0 : 0.8)} aria-label="Mute">{volume ? <Volume2 /> : <VolumeX />}</button>
            <input className="volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => changeVolume(Number(e.target.value))} />
            <span className="time">{formatTime(current)} <i>/</i> {formatTime(duration)}</span>
          </div>
          <div className="control-cluster">
            <div className="speed-menu">
              <button onClick={() => setShowSpeed(!showSpeed)}>{speed}×</button>
              <AnimatePresence>{showSpeed && <motion.div className="speed-popover" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>{[0.75, 1, 1.25, 1.5, 2].map((rate) => <button key={rate} className={rate === speed ? 'active' : ''} onClick={() => changeSpeed(rate)}>{rate}×</button>)}</motion.div>}</AnimatePresence>
            </div>
            <button onClick={() => playerRef.current?.requestFullscreen()} aria-label="Fullscreen"><Maximize /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CourseRail({ data, open, onClose, onSelect, onEditModule, onEditLecture, canEdit = false }) {
  return (
    <AnimatePresence>
      {(open || window.innerWidth > 900) && (
        <motion.aside className={`course-rail ${open ? 'mobile-open' : ''}`} initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} transition={{ duration: .25 }}>
          <div className="rail-top">
            <button className="icon-button desktop-back" aria-label="Back"><ArrowLeft /></button>
            <div><span className="overline">{data.course.eyebrow}</span><h1>{data.course.title}</h1></div>
            <button className="icon-button close-rail" onClick={onClose} aria-label="Close menu"><X /></button>
          </div>
          <div className="progress-block">
            <div><span>Course progress <small>{data.course.completedLessons || 0}/{data.course.totalLessons || data.modules.reduce((total, module) => total + module.lessons.length, 0)} lessons</small></span><strong>{data.course.progress}%</strong></div>
            <div className="progress-track"><i style={{ width: `${data.course.progress}%` }} /></div>
          </div>
          <div className="module-list">
            {data.modules.map((module, moduleIndex) => (
              <section key={moduleIndex} className="module">
                <div className="module-heading"><h2>{module.title}</h2>{canEdit && <button onClick={() => onEditModule(moduleIndex, module.title)} aria-label={`Edit ${module.title}`} title="Edit module"><PencilLine /></button>}</div>
                {module.lessons.map((lesson, lessonIndex) => (
                  <div key={lesson.id || `${moduleIndex}-${lessonIndex}`} className={`lesson-row ${lesson.active ? 'active' : ''}`}>
                    <button className="lesson" onClick={() => onSelect(moduleIndex, lessonIndex)} aria-current={lesson.active ? 'page' : undefined}>
                      <span className="lesson-status">{lesson.done ? <Check /> : lesson.active ? <Play fill="currentColor" /> : <Circle />}</span>
                      <span><b>{lesson.title}</b><small>{String(data.modules.slice(0, moduleIndex).reduce((total, item) => total + item.lessons.length, 0) + lessonIndex + 1).padStart(2, '0')} · {lesson.duration}</small></span>
                      <span className="lesson-arrow"><ChevronRight /></span>
                    </button>
                    {canEdit && <button className="lecture-edit-button" onClick={() => onEditLecture(moduleIndex, lessonIndex, lesson.title)} aria-label={`Edit ${lesson.title}`} title="Edit lecture name"><PencilLine /></button>}
                  </div>
                ))}
              </section>
            ))}
          </div>
          <div className="instructor"><div className="avatar">MC</div><div><b>{data.course.instructor}</b><span>Course instructor</span></div><ChevronRight /></div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function LectureResources({ lecture }) {
  const resources = [
    lecture.classNotesUrl && { label: 'Class notes', detail: 'PDF', url: lecture.classNotesUrl, icon: FileText },
    lecture.assignmentPdfUrl && { label: 'Assignment brief', detail: 'PDF', url: lecture.assignmentPdfUrl, icon: ClipboardList },
  ].filter(Boolean)
  if (!resources.length) return null
  return (
    <motion.div className="resource-strip" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <span className="resource-label">Lesson resources</span>
      <div>{resources.map((resource) => { const Icon = resource.icon; return <a key={resource.label} href={resource.url} target="_blank" rel="noreferrer"><span><Icon /></span><b>{resource.label}<small>{resource.detail}</small></b><ExternalLink /></a> })}</div>
    </motion.div>
  )
}

function Notes({ value, onChange, onSave, status }) {
  return (
    <motion.div className="notes-pane" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="pane-heading"><div><h3>Lecture notes</h3><p>Your notes are private and saved to this course.</p></div><span className={`save-status ${status === 'Saved' ? 'saved' : ''}`}>{status}</span></div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="Capture an idea, timestamp, or question…" />
      <div className="note-footer"><span>Markdown-friendly · {value.length.toLocaleString()} characters</span><button className="primary-button" onClick={onSave}>Save notes</button></div>
    </motion.div>
  )
}

function Assignment({ item, onSubmit }) {
  const [response, setResponse] = useState(item.submission || '')
  const [error, setError] = useState('')
  const submit = async () => { try { setError(''); await onSubmit(response) } catch (err) { setError(err.message) } }
  return (
    <motion.div className="assignment-pane" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="assignment-meta"><span className="status-dot">{item.status === 'submitted' ? 'Submitted' : 'Open'}</span><span>Due {item.due}</span></div>
      <h3>{item.title}</h3><p>{item.description}</p>
      <label htmlFor="submission">Response or shareable file link</label>
      <textarea id="submission" value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Paste a Drive link or write your response…" disabled={item.status === 'submitted'} />
      {error && <span className="form-error">{error}</span>}
      <div className="assignment-footer"><span>{item.status === 'submitted' ? 'Your work is with the instructor.' : 'Make sure linked files allow viewer access.'}</span><button className="primary-button" onClick={submit} disabled={item.status === 'submitted'}>{item.status === 'submitted' ? <><Check /> Submitted</> : 'Submit work'}</button></div>
    </motion.div>
  )
}

function VideoModal({ lecture, onClose, onSave }) {
  const [title, setTitle] = useState(lecture.title)
  const [videoUrl, setVideoUrl] = useState(lecture.videoUrl)
  const [error, setError] = useState('')
  const save = async () => { try { setError(''); await onSave({ title, videoUrl }); onClose() } catch (err) { setError(err.message) } }
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.div className="modal" initial={{ scale: .96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 16 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-heading"><div><span className="modal-icon"><Upload /></span><div><h2>Set lecture video</h2><p>Use a public Google Drive or direct video URL.</p></div></div><button className="icon-button" onClick={onClose}><X /></button></div>
        <label>Lecture title<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>Public video URL<input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://drive.google.com/file/d/…/view" /></label>
        <div className="share-help"><Gauge /><span><b>Google Drive:</b> set General access to “Anyone with the link” before saving.</span></div>
        {error && <span className="form-error">{error}</span>}
        <div className="modal-actions"><button className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={save}>Use this video</button></div>
      </motion.div>
    </motion.div>
  )
}

function NewLectureModal({ modules, onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', moduleIndex: '1', duration: '', videoUrl: '', classNotesUrl: '', assignmentPdfUrl: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true); setError('')
      await onCreate(form)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.form className="modal lecture-form" initial={{ scale: .96, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 18 }} onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading"><div><span className="modal-icon"><Plus /></span><div><h2>Add a new lecture</h2><p>Publish a video lesson to the course outline.</p></div></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X /></button></div>
        <label>Lecture title<input autoFocus value={form.title} onChange={update('title')} placeholder="e.g. Turning insights into opportunities" /></label>
        <div className="form-grid">
          <label>Module<select value={form.moduleIndex} onChange={update('moduleIndex')}>{modules.map((module, index) => <option key={module.title} value={index}>{module.title}</option>)}</select></label>
          <label>Duration<input value={form.duration} onChange={update('duration')} placeholder="e.g. 24 min" /></label>
        </div>
        <div className="resource-divider"><span>Lecture resources</span></div>
        <label>Public video URL <em>Required</em><input value={form.videoUrl} onChange={update('videoUrl')} placeholder="https://drive.google.com/file/d/…/view" /></label>
        <label>Class notes PDF URL <em>Optional</em><input value={form.classNotesUrl} onChange={update('classNotesUrl')} placeholder="https://drive.google.com/…/class-notes.pdf" /></label>
        <label>Assignment PDF URL <em>Optional</em><input value={form.assignmentPdfUrl} onChange={update('assignmentPdfUrl')} placeholder="https://drive.google.com/…/assignment.pdf" /></label>
        <div className="share-help"><Gauge /><span><b>Public access required:</b> set Drive files to “Anyone with the link.” Direct MP4, WebM, and PDF links are supported.</span></div>
        {error && <span className="form-error">{error}</span>}
        <div className="modal-actions"><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Adding lecture…' : 'Add lecture'}</button></div>
      </motion.form>
    </motion.div>
  )
}

function LectureResourcesModal({ lecture, onClose, onSave }) {
  const [form, setForm] = useState({
    videoUrl: lecture.videoUrl || '',
    classNotesUrl: lecture.classNotesUrl || '',
    assignmentPdfUrl: lecture.assignmentPdfUrl || '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true); setError('')
      await onSave(lecture.moduleIndex, lecture.lectureIndex, form)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.form className="modal lecture-form" initial={{ scale: .96, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 18 }} onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading"><div><span className="modal-icon"><Link2 /></span><div><h2>Lecture resources</h2><p>{lecture.title}</p></div></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X /></button></div>
        <label>Public video URL<input autoFocus value={form.videoUrl} onChange={update('videoUrl')} placeholder="Google Drive, MP4, or WebM link" /></label>
        <label>Class notes PDF URL<input value={form.classNotesUrl} onChange={update('classNotesUrl')} placeholder="Public PDF or Google Drive link" /></label>
        <label>Assignment PDF URL<input value={form.assignmentPdfUrl} onChange={update('assignmentPdfUrl')} placeholder="Public PDF or Google Drive link" /></label>
        <div className="share-help"><Gauge /><span>Leave an optional PDF field empty to remove that resource from the student lesson.</span></div>
        {error && <span className="form-error">{error}</span>}
        <div className="modal-actions"><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving resources…' : 'Save resources'}</button></div>
      </motion.form>
    </motion.div>
  )
}

function EditModuleModal({ module, onClose, onSave }) {
  const [title, setTitle] = useState(module.title)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true); setError('')
      await onSave(module.index, title)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.form className="modal module-form" initial={{ scale: .96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 16 }} onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading"><div><span className="modal-icon"><PencilLine /></span><div><h2>Edit module</h2><p>Rename this section of the course outline.</p></div></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X /></button></div>
        <label>Module name<input autoFocus maxLength="80" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. 02 · Research for signal" /></label>
        <div className="field-meta"><span>Keep the number to preserve the course sequence.</span><span>{title.length}/80</span></div>
        {error && <span className="form-error">{error}</span>}
        <div className="modal-actions"><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
      </motion.form>
    </motion.div>
  )
}

function EditLectureModal({ lecture, onClose, onSave }) {
  const [title, setTitle] = useState(lecture.title)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    try {
      setSaving(true); setError('')
      await onSave(lecture.moduleIndex, lecture.lectureIndex, title)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.form className="modal module-form" initial={{ scale: .96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 16 }} onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading"><div><span className="modal-icon"><PencilLine /></span><div><h2>Edit lecture name</h2><p>Rename this lesson everywhere in the course.</p></div></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X /></button></div>
        <label>Lecture name<input autoFocus maxLength="120" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Finding the signal in research" /></label>
        <div className="field-meta"><span>The video link and lesson progress stay unchanged.</span><span>{title.length}/120</span></div>
        {error && <span className="form-error">{error}</span>}
        <div className="modal-actions"><button type="button" className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
      </motion.form>
    </motion.div>
  )
}

function AuthScreen({ onAuthenticate }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  const changeMode = (nextMode) => { setMode(nextMode); setError('') }
  const submit = async (event) => {
    event.preventDefault()
    try {
      setBusy(true); setError('')
      await onAuthenticate(mode, form)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell">
      <motion.section className="auth-story" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <a className="auth-brand" href="#"><span className="brand-mark">A</span><span>Arcwell</span></a>
        <div className="auth-story-copy"><span className="overline">YOUR LEARNING WORKSPACE</span><h1>Study with focus.<br />Build with evidence.</h1><p>Lectures, notes, and assignments in one considered space.</p></div>
        <div className="auth-proof"><span>PS—204</span><span>Modern Product Strategy</span><i /></div>
      </motion.section>
      <motion.section className="auth-panel" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .08 }}>
        <div className="auth-form-wrap">
          <span className="auth-icon"><GraduationCap /></span>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p>{mode === 'login' ? 'Sign in to continue your course.' : 'New accounts are created as students.'}</p>
          <div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>Log in</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => changeMode('signup')}>Sign up</button></div>
          <form onSubmit={submit}>
            {mode === 'signup' && <label>Full name<span className="auth-input"><UserRound /><input value={form.name} onChange={update('name')} autoComplete="name" placeholder="Your name" /></span></label>}
            <label>Email address<span className="auth-input"><Mail /><input type="email" value={form.email} onChange={update('email')} autoComplete="email" placeholder="you@example.com" /></span></label>
            <label>Password<span className="auth-input"><LockKeyhole /><input type="password" value={form.password} onChange={update('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'login' ? 'Enter your password' : 'At least 8 characters'} /></span></label>
            {error && <span className="auth-error">{error}</span>}
            <button className="auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create student account'}<ChevronRight /></button>
          </form>
          <p className="auth-footnote"><ShieldCheck /> Secure session · Passwords are stored as one-way hashes</p>
        </div>
      </motion.section>
    </main>
  )
}

function AdminDashboard({ data, user, onPreview, onLogout, onNewLecture, onEditModule, onEditLecture, onEditResources }) {
  const lessonCount = data.modules.reduce((total, module) => total + module.lessons.length, 0)
  const videoCount = data.modules.reduce((total, module) => total + module.lessons.filter((lesson) => lesson.videoUrl).length, 0)
  const pdfCount = data.modules.reduce((total, module) => total + module.lessons.filter((lesson) => lesson.classNotesUrl || lesson.assignmentPdfUrl).length, 0)
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand"><span className="brand-mark">A</span><div><b>Arcwell</b><span>Administration</span></div></div>
        <nav className="admin-nav"><button className="active"><LayoutList />Course content</button><button onClick={onPreview}><Eye />Student preview</button></nav>
        <div className="admin-account"><span className="avatar">{user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><div><b>{user.name}</b><span>Administrator</span></div><button onClick={onLogout} aria-label="Log out" title="Log out"><LogOut /></button></div>
      </aside>
      <main className="admin-main">
        <header className="admin-header"><div><span className="overline">COURSE MANAGEMENT</span><h1>{data.course.title}</h1><p>Structure modules and publish lecture videos.</p></div><button className="primary-button admin-add" onClick={onNewLecture}><Plus /> Add lecture</button></header>
        <section className="admin-summary"><div><span>Modules</span><strong>{String(data.modules.length).padStart(2, '0')}</strong></div><div><span>Lectures</span><strong>{String(lessonCount).padStart(2, '0')}</strong></div><div><span>With video</span><strong>{String(videoCount).padStart(2, '0')}</strong></div><div><span>With PDFs</span><strong>{String(pdfCount).padStart(2, '0')}</strong></div></section>
        <section className="admin-content">
          <div className="admin-section-heading"><div><h2>Course outline</h2><p>Edit names or add a new lecture to any module.</p></div><span>{lessonCount} lectures</span></div>
          {data.modules.map((module, moduleIndex) => (
            <motion.section className="admin-module" key={moduleIndex} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: moduleIndex * .05 }}>
              <header><div><span>{String(moduleIndex + 1).padStart(2, '0')}</span><h3>{module.title.replace(/^\d+\s*·\s*/, '')}</h3></div><button onClick={() => onEditModule(moduleIndex, module.title)}><PencilLine /> Edit module</button></header>
              <div className="admin-lessons">
                {module.lessons.map((lesson, lectureIndex) => (
                  <div className="admin-lesson" key={lesson.id || `${moduleIndex}-${lectureIndex}`}>
                    <span className={`admin-lesson-state ${lesson.videoUrl ? 'published' : ''}`}>{lesson.videoUrl ? <Play fill="currentColor" /> : <Circle />}</span>
                    <div><b>{lesson.title}</b><span>{lesson.duration} · {lesson.videoUrl ? 'Video ready' : 'No video'} · {[lesson.classNotesUrl, lesson.assignmentPdfUrl].filter(Boolean).length} PDFs</span></div>
                    {lesson.active && <span className="current-chip">Currently open</span>}
                    <div className="admin-lesson-actions"><button onClick={() => onEditResources(moduleIndex, lectureIndex, lesson)}><Link2 /> Resources</button><button onClick={() => onEditLecture(moduleIndex, lectureIndex, lesson.title)}><PencilLine /> Name</button></div>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </section>
      </main>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('notes')
  const [notes, setNotes] = useState('')
  const [noteStatus, setNoteStatus] = useState('All changes saved')
  const [railOpen, setRailOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [newLectureOpen, setNewLectureOpen] = useState(false)
  const [editingModule, setEditingModule] = useState(null)
  const [editingLecture, setEditingLecture] = useState(null)
  const [editingResources, setEditingResources] = useState(null)
  const [adminPreview, setAdminPreview] = useState(false)
  const [progressSaving, setProgressSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const auth = await api.me()
        setUser(auth.user)
        if (auth.user) {
          const course = await api.getCourse()
          setData(course); setNotes(course.notes)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setAuthReady(true)
      }
    }
    bootstrap()
  }, [])

  const authenticate = async (mode, payload) => {
    const auth = mode === 'login' ? await api.login(payload) : await api.signup(payload)
    const course = await api.getCourse()
    setUser(auth.user); setData(course); setNotes(course.notes); setError('')
  }

  const logout = async () => {
    await api.logout()
    setUser(null); setData(null); setAdminPreview(false); setRailOpen(false)
  }

  const updateLecture = async (payload) => {
    const lecture = await api.updateLecture(payload)
    setData((current) => ({ ...current, lecture }))
  }

  const createLecture = async (payload) => {
    const updated = await api.createLecture(payload)
    setData(updated)
    setNotes(updated.notes)
    setActiveTab('notes')
  }

  const selectLecture = async (moduleIndex, lectureIndex) => {
    try {
      const updated = await api.selectLecture(moduleIndex, lectureIndex)
      setData(updated)
      setRailOpen(false)
      setActiveTab('notes')
    } catch (err) {
      setError(err.message)
    }
  }

  const updateModule = async (index, title) => {
    const updated = await api.updateModule(index, title)
    setData(updated)
  }

  const updateLectureName = async (moduleIndex, lectureIndex, title) => {
    const updated = await api.updateLectureName(moduleIndex, lectureIndex, title)
    setData(updated)
  }

  const updateLectureResources = async (moduleIndex, lectureIndex, payload) => {
    const updated = await api.updateLectureResources(moduleIndex, lectureIndex, payload)
    setData(updated)
  }

  const saveNotes = async () => {
    setNoteStatus('Saving…')
    try { await api.saveNotes(notes); setNoteStatus('Saved') }
    catch { setNoteStatus('Save failed') }
  }

  const submitAssignment = async (response) => {
    const updated = await api.submitAssignment(data.assignments[0].id, response)
    setData((current) => ({ ...current, assignments: [updated] }))
  }

  if (!authReady) return <main className="load-state"><div className="brand-mark pulse">A</div><span>Checking your session…</span></main>
  if (!user) return <AuthScreen onAuthenticate={authenticate} />
  if (error) return <main className="load-state"><div className="brand-mark">A</div><h1>Arcwell is offline</h1><p>{error}</p><button className="primary-button" onClick={logout}>Log out</button></main>
  if (!data) return <main className="load-state"><div className="brand-mark pulse">A</div><span>Opening your course…</span></main>

  const canEdit = user.role === 'admin'
  const activeModuleIndex = data.modules.findIndex((module) => module.lessons.some((lesson) => lesson.active))
  const activeModule = data.modules[activeModuleIndex]
  const activeLectureIndex = activeModule?.lessons.findIndex((lesson) => lesson.active) ?? -1
  const activeLesson = activeModule?.lessons[activeLectureIndex]
  const totalLectures = data.modules.reduce((total, module) => total + module.lessons.length, 0)

  const setLessonCompleted = async (completed) => {
    if (activeModuleIndex < 0 || activeLectureIndex < 0 || progressSaving) return
    try {
      setProgressSaving(true)
      const result = await api.updateProgress(activeModuleIndex, activeLectureIndex, completed)
      setData((current) => ({
        ...current,
        lecture: { ...current.lecture, done: completed },
        course: { ...current.course, progress: result.progress, completedLessons: result.completedLessons, totalLessons: result.totalLessons },
        modules: current.modules.map((module, moduleIndex) => moduleIndex !== activeModuleIndex ? module : {
          ...module,
          lessons: module.lessons.map((lesson, lectureIndex) => lectureIndex === activeLectureIndex ? { ...lesson, done: completed } : lesson),
        }),
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setProgressSaving(false)
    }
  }

  if (canEdit && !adminPreview) {
    return (
      <>
        <AdminDashboard data={data} user={user} onPreview={() => setAdminPreview(true)} onLogout={logout} onNewLecture={() => setNewLectureOpen(true)} onEditModule={(index, title) => setEditingModule({ index, title })} onEditLecture={(moduleIndex, lectureIndex, title) => setEditingLecture({ moduleIndex, lectureIndex, title })} onEditResources={(moduleIndex, lectureIndex, lecture) => setEditingResources({ moduleIndex, lectureIndex, ...lecture })} />
        <AnimatePresence>{newLectureOpen && <NewLectureModal modules={data.modules} onClose={() => setNewLectureOpen(false)} onCreate={createLecture} />}</AnimatePresence>
        <AnimatePresence>{editingModule && <EditModuleModal module={editingModule} onClose={() => setEditingModule(null)} onSave={updateModule} />}</AnimatePresence>
        <AnimatePresence>{editingLecture && <EditLectureModal lecture={editingLecture} onClose={() => setEditingLecture(null)} onSave={updateLectureName} />}</AnimatePresence>
        <AnimatePresence>{editingResources && <LectureResourcesModal lecture={editingResources} onClose={() => setEditingResources(null)} onSave={updateLectureResources} />}</AnimatePresence>
      </>
    )
  }

  return (
    <div className="app-shell">
      <CourseRail data={data} open={railOpen} onClose={() => setRailOpen(false)} onSelect={selectLecture} canEdit={canEdit} onEditModule={(index, title) => setEditingModule({ index, title })} onEditLecture={(moduleIndex, lectureIndex, title) => setEditingLecture({ moduleIndex, lectureIndex, title })} />
      {railOpen && <button className="rail-scrim" aria-label="Close menu" onClick={() => setRailOpen(false)} />}
      <main className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setRailOpen(true)}><Menu /></button>
          <a className="brand" href="#"><span className="brand-mark">A</span><span>Arcwell</span></a>
          <div className="topbar-right"><span className="topbar-progress">Lesson {data.lecture.number} <i /> {data.course.progress}% complete</span>{canEdit && <button className="admin-return-button" onClick={() => setAdminPreview(false)}>Admin console</button>}<span className="role-chip">{user.role === 'admin' ? 'Admin preview' : 'Student'}</span><button className="topbar-logout" onClick={logout} aria-label="Log out" title={`Log out ${user.name}`}><LogOut /></button></div>
        </header>

        <motion.div key={`${data.lecture.number}-${data.lecture.title}`} className="lecture-stage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .32 }}>
          <div className="stage-kicker"><span>Now learning</span><i /> <span>Lesson {data.lecture.number} of {String(totalLectures).padStart(2, '0')}</span></div>
          <Player lecture={data.lecture} onComplete={() => !activeLesson?.done && setLessonCompleted(true)} />
          <div className="lecture-heading">
            <div><span className="overline">{activeModule?.title || data.lecture.moduleTitle || 'COURSE LECTURE'}</span><h2>{data.lecture.title}</h2><p>{data.lecture.duration} · {data.lecture.videoUrl ? 'Video lesson' : 'Resources only'}</p></div>
            <div className="lecture-actions"><button className={`complete-button ${activeLesson?.done ? 'completed' : ''}`} onClick={() => setLessonCompleted(!activeLesson?.done)} disabled={progressSaving}>{activeLesson?.done ? <><Check /> Completed</> : <><Circle /> Mark complete</>}</button>{canEdit && <button className="outline-button" onClick={() => setModalOpen(true)}><Settings2 /> Video source</button>}</div>
          </div>
          <LectureResources lecture={data.lecture} />
        </motion.div>

        <section className="learning-panel">
          <div className="tabs" role="tablist">
            <button className={activeTab === 'notes' ? 'active' : ''} onClick={() => setActiveTab('notes')}><FileText /> Notes</button>
            <button className={activeTab === 'assignment' ? 'active' : ''} onClick={() => setActiveTab('assignment')}><BookOpen /> Assignment <span className="tab-count">1</span></button>
            <button className={activeTab === 'outline' ? 'active' : ''} onClick={() => setActiveTab('outline')}><List /> Lesson details</button>
          </div>
          <AnimatePresence mode="wait">
            {activeTab === 'notes' && <Notes key="notes" value={notes} onChange={(value) => { setNotes(value); setNoteStatus('Unsaved changes') }} onSave={saveNotes} status={noteStatus} />}
            {activeTab === 'assignment' && <Assignment key="assignment" item={data.assignments[0]} onSubmit={submitAssignment} />}
            {activeTab === 'outline' && <motion.div key="outline" className="details-pane" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><div><span>In this lesson</span><h3>Turn raw conversations into evidence your team can use.</h3></div><ol><li><span>00:00</span>What counts as a signal</li><li><span>07:42</span>Separate behavior from opinion</li><li><span>18:10</span>Build the opportunity map</li></ol></motion.div>}
          </AnimatePresence>
        </section>
      </main>

      <AnimatePresence>{canEdit && modalOpen && <VideoModal lecture={data.lecture} onClose={() => setModalOpen(false)} onSave={updateLecture} />}</AnimatePresence>
      <AnimatePresence>{canEdit && editingModule && <EditModuleModal module={editingModule} onClose={() => setEditingModule(null)} onSave={updateModule} />}</AnimatePresence>
      <AnimatePresence>{canEdit && editingLecture && <EditLectureModal lecture={editingLecture} onClose={() => setEditingLecture(null)} onSave={updateLectureName} />}</AnimatePresence>
    </div>
  )
}
