import { doc, setDoc, serverTimestamp, increment } from 'firebase/firestore'
import { db } from './firebase'

const store = (key, fallback) => {
  const params = new URLSearchParams(window.location.search)
  const v = params.get(key) || sessionStorage.getItem(key) || fallback
  sessionStorage.setItem(key, v)
  return v
}

function getIdentity() {
  const participant = store('p', 'unknown')
  const condition = store('c', 'unknown')
  const sessionId = store('sid', `${participant}_${condition}_${Date.now().toString(36)}`)
  const start = Number(store('sstart', String(Date.now())))
  return { participant, condition, sessionId, start }
}

function nextSeq() {
  const n = Number(sessionStorage.getItem('seq') || 0) + 1
  sessionStorage.setItem('seq', String(n))
  return String(n).padStart(3, '0')
}

// Fields to update on the session summary document, per event type
function summaryFor(type, data) {
  switch (type) {
    case 'session_started':
      return { startedAt: serverTimestamp(), completed: false, checkCount: 0, usedShowAnswers: false }
    case 'pretest_completed':
      return {pretest: {
      answers: data.answers,
      score: data.score,
      total: data.total,
      dontKnow: data.dontKnow,
    },
  }
    case 'case_answered':
      return { answers: { [data.case]: { selected: data.selected, correct: data.correct, caseId: data.caseId } } }
    case 'check_answers':
      return { lastScore: data.score, checkCount: increment(1) }
    case 'answers_revealed':
      return { usedShowAnswers: true }
    case 'session_completed':
      return {
        completed: true,
        completedAt: serverTimestamp(),
        finalScore: data.finalScore,
        totalSeconds: data.totalSeconds,
        usedShowAnswers: data.usedShowAnswers,
      }
    // Exam results live under `exam` so they never overwrite the Exo fields
    case 'exam_started':
      return { exam: { startedAt: serverTimestamp(), completed: false } }
    case 'exam_submitted':
      return {
        exam: {
          completed: true,
          submittedAt: serverTimestamp(),
          part1Score: data.part1Score,
          part1Total: data.part1Total,
          graphScore: data.graphScore,
          graphTotal: data.graphTotal,
          totalSeconds: data.totalSeconds,
          answers: data.answers,
        },
      }
    case 'exam_finished':
      return { exam: { finishedAt: serverTimestamp(), reviewSeconds: data.reviewSeconds } }
    default:
      return {}
  }
}

export function logEvent(type, data = {}) {
  const { participant, condition, sessionId, start } = getIdentity()
  const sessionRef = doc(db, 'sessions', sessionId)

  // 1. Summary on the session document
  const summary = setDoc(
    sessionRef,
    {
      participant,
      condition,
      lastEventAt: serverTimestamp(),
      ...summaryFor(type, data),
    },
    { merge: true }
  )

  // 2. Timeline entry, numbered so the console sorts it chronologically
  const event = setDoc(doc(sessionRef, 'events', `${nextSeq()}_${type}`), {
    type,
    ...data,
    secondsSinceStart: Math.round((Date.now() - start) / 1000),
    clientTime: Date.now(),
    serverTime: serverTimestamp(),
  })

  return Promise.all([summary, event]).catch((err) => console.error('log failed', type, err))
}

getIdentity()
