import { getIdentity } from './logger'

/* Session file, filled during the visit and downloaded from the End page.
   It stays in this tab's sessionStorage: nothing here is sent over the network.

   phases:    time per phase. activeSeconds excludes time away from the tab or window
   sections:  active time per part of a long page, from the [data-section] elements
   questions: moves (answer given or changed) and erasures (answer removed) per question
   events:    every interaction in order. t = seconds since the start of the session
   Text typed by the student is never stored, only its length */

const KEY = 'tracker'
const SCHEMA_VERSION = 2

const isActive = () => document.visibilityState === 'visible' && document.hasFocus()

const newState = (sessionId) => ({
  sessionId,
  startedAt: new Date().toISOString(),
  phase: null,
  section: null,
  active: isActive(),
  lastTick: Date.now(),
  phases: {},
  sections: {},
  questions: {},
  resets: {},
  scores: { pretest: null, exo: null, exam: null },
  events: [],
})

function load() {
  const { sessionId } = getIdentity()
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY))
    if (saved?.sessionId === sessionId) return saved
  } catch {
    // Unreadable copy: start again
  }
  return newState(sessionId)
}

const state = load()

function save() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked: the data stays in memory until the tab reloads
    state.storageFailed = true
  }
}

// Adds the time since the last call to the current phase and section
function tick() {
  const now = Date.now()
  const dt = (now - state.lastTick) / 1000
  state.lastTick = now
  if (state.phase) {
    const p = state.phases[state.phase]
    p.seconds += dt
    if (state.active) p.activeSeconds += dt
  }
  if (state.section && state.active) {
    // Keyed by phase too: reading the exam correction is not time spent on the exam
    const key = `${state.phase}.${state.section}`
    state.sections[key] = (state.sections[key] || 0) + dt
  }
}

const round = (s) => Math.round(s * 100) / 100

function addEvent(object, action, extra) {
  tick()
  state.events.push({
    t: round((Date.now() - getIdentity().start) / 1000),
    phase: state.phase,
    object,
    action,
    ...extra,
  })
  save()
}

export const trackEvent = (object, action, extra = {}) => addEvent(object, action, extra)

/* ---------- Phases and sections ---------- */
export function enterPhase(name) {
  if (state.phase === name) return // StrictMode and reloads must not count a new visit
  tick()
  state.phases[name] ??= { seconds: 0, activeSeconds: 0, visits: 0 }
  state.phases[name].visits += 1
  state.phase = name
  addEvent(`phase.${name}`, 'enter')
}

function setSection(name) {
  tick()
  state.section = name
  save()
}

// The current section is the [data-section] element crossing the middle of the screen
export function watchSections() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const name = e.target.dataset.section
        if (e.isIntersecting) setSection(name)
        else if (state.section === name) setSection(null)
      })
    },
    { rootMargin: '-50% 0px -50% 0px' }
  )
  document.querySelectorAll('[data-section]').forEach((el) => observer.observe(el))
  return () => {
    observer.disconnect()
    setSection(null)
  }
}

/* ---------- Questions ---------- */
function count(question, field) {
  state.questions[question] ??= { moves: 0, erasures: 0 }
  state.questions[question][field] += 1
  addEvent(question, field === 'moves' ? 'move' : 'erase')
}

export const countMove = (question) => count(question, 'moves')
export const countErasure = (question) => count(question, 'erasures')

export function countReset(page) {
  state.resets[page] = (state.resets[page] || 0) + 1
  addEvent(`${page}.reset`, 'reset')
}

/* ---------- Scores ---------- */
export function recordScore(part, data) {
  state.scores[part] = { ...state.scores[part], ...data }
  save()
}

// One entry per click on "check my answers"
export function recordCheck(part, data) {
  const checks = state.scores[part]?.checks || []
  recordScore(part, { checks: [...checks, { t: round((Date.now() - getIdentity().start) / 1000), ...data }] })
}

/* ---------- Automatic capture of clicks ---------- */
function describe(target) {
  const el = target.closest(
    '[data-track], button, a, input, select, textarea, summary, [role="button"]'
  )
  if (!el) {
    const cls = target.getAttribute('class')?.split(' ')[0]
    return `${target.tagName.toLowerCase()}${cls ? `.${cls}` : ''}`
  }
  if (el.dataset.track) return el.dataset.track
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' && el.type === 'radio') {
    const group = [...document.querySelectorAll('input[type="radio"]')].filter((r) => r.name === el.name)
    return `radio:${el.name}:${group.indexOf(el)}`
  }
  // Fields are named by their label only: their content must never reach the file
  if (tag === 'input' || tag === 'textarea') return `${tag}:${el.getAttribute('aria-label') || el.name || 'text'}`
  const label = el.getAttribute('aria-label') || el.textContent.trim().slice(0, 60)
  return `${tag}:${label}`
}

function onClick(e) {
  if (!(e.target instanceof Element)) return
  // A click on a label also fires a click on its input: keep only that one
  if (e.target.closest('label') && !e.target.matches('input, select, textarea')) return
  addEvent(describe(e.target), 'click')
}

function onChange(e) {
  if (e.target.tagName !== 'SELECT') return
  addEvent(describe(e.target), 'change', { value: e.target.value })
}

function onActivityChange() {
  const now = isActive()
  if (now === state.active) return
  tick()
  state.active = now
  addEvent('page', now ? 'return' : 'leave')
}

export function initTracker() {
  document.addEventListener('click', onClick, true)
  document.addEventListener('change', onChange, true)
  document.addEventListener('visibilitychange', onActivityChange)
  window.addEventListener('focus', onActivityChange)
  window.addEventListener('blur', onActivityChange)
  window.addEventListener('pagehide', () => {
    tick()
    save()
  })
  onActivityChange() // A reload hides the old page: this records that the student is back
}

/* ---------- Export ---------- */
export function buildSessionFile() {
  tick()
  save()
  const { sessionId, participant, condition } = getIdentity()
  const roundMap = (map, fn) => Object.fromEntries(Object.entries(map).map(([k, v]) => [k, fn(v)]))
  // Adds up one or several phases, for the totals block
  const time = (...names) => {
    const sum = (field) =>
      round(names.reduce((total, name) => total + (state.phases[name]?.[field] || 0), 0))
    return { seconds: sum('seconds'), activeSeconds: sum('activeSeconds') }
  }
  const { pretest, exo, exam } = state.scores
  return {
    schemaVersion: SCHEMA_VERSION,
    session: {
      sessionId,
      participant,
      condition,
      version: condition === 'A' ? 'without_ai' : 'with_ai',
      // The questions change over time: this tells which site produced the file
      appVersion: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || 'dev',
      startedAt: state.startedAt,
      exportedAt: new Date().toISOString(),
      ...(state.storageFailed && { storageFailed: true }),
    },
    totals: {
      session: time(...Object.keys(state.phases)),
      pretest: { ...time('pretest'), score: pretest?.score ?? null, total: pretest?.total ?? null },
      lesson: time('lesson'),
      // Includes the review, which is also available on its own under `phases`
      exercises: {
        ...time('exercises', 'review'),
        reviewSeconds: time('review').seconds,
        score: exo?.finalScore ?? null,
        total: exo?.total ?? null,
      },
      // Stops when the answers are submitted: the correction is counted apart
      exam: {
        ...time('exam'),
        correctionSeconds: time('exam_correction').seconds,
        score: exam?.score ?? null,
        total: exam?.total ?? null,
      },
    },
    scores: state.scores,
    phases: roundMap(state.phases, (p) => ({
      seconds: round(p.seconds),
      activeSeconds: round(p.activeSeconds),
      visits: p.visits,
    })),
    sections: roundMap(state.sections, round),
    questions: state.questions,
    resets: state.resets,
    events: state.events,
  }
}

export function downloadSessionFile() {
  const file = buildSessionFile()
  const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `session_${file.session.sessionId}.json`
  link.click()
  URL.revokeObjectURL(url)
}
