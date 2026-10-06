import { useEffect, useMemo, useRef, useState } from 'react'
import { logEvent } from '../logger'
import { useNavigate } from 'react-router-dom'
import { Gel, Microsat, ProbeMap } from '../components/Figures'
import './Exo.css'
import './Exam.css'

/* ---------- Diagnoses ---------- */
const DIAG = {
  normal: 'No disease (healthy sibling)',
  ube3a: 'Point mutation of the UBE3A gene',
  upd: 'Paternal uniparental disomy',
  del: 'Maternal deletion',
  imprint: 'Imprinting error',
}
const CHOICES = ['ube3a', 'upd', 'del', 'imprint']

/* ---------- Southern blot by diagnosis ----------
   [XbaI lane, XbaI+NotI lane], each lane = [4.2 kb, 0.9 or 3.3 kb]
   0 = no band, 1 = thin band, 2 = thick band */
const NORMAL_GEL = [[2, 0], [1, 1]]
const GEL_BY_DIAG = {
  normal: NORMAL_GEL,
  ube3a: NORMAL_GEL,
  upd: [[2, 0], [0, 2]],
  imprint: [[2, 0], [0, 2]],
  del: [[1, 0], [0, 1]],
}

/* ---------- Families (parents' microsatellite alleles, never shared) ---------- */
const F1 = { father: { crit: [1, 2], out: [1, 3] }, mother: { crit: [3, 4], out: [2, 2] } }
const F2 = { father: { crit: [2, 5], out: [2, 2] }, mother: { crit: [1, 3], out: [1, 4] } }
const F3 = { father: { crit: [4, 4], out: [1, 5] }, mother: { crit: [1, 2], out: [3, 4] } }

/* ---------- Part 1 cases ----------
   hide: which of the three pieces the student completes
   child: the child's microsatellites (for `hide: 'ms'` it is one correct answer among others) */
const CASES = [
  {
    diag: 'normal', hide: 'gel', reverse: false, fam: F2, child: { crit: [2, 3], out: [2, 4] },
    explain: 'A healthy child has one methylated maternal allele and one unmethylated paternal allele, like the parents: a thick 4.2 kb band with Xba I alone, then a thin 4.2 kb and a thin 0.9 kb band after Xba I + Not I.',
  },
  {
    diag: 'del', hide: 'diag', reverse: false, fam: F3, child: { crit: [4], out: [5, 3] },
    explain: 'Every band is thin (a single copy is left) and the methylated band is missing. Microsatellites: in the critical region only one paternal allele is visible, while outside it both parents contribute.',
  },
  {
    diag: 'upd', hide: 'ms', reverse: false, fam: F1, child: { crit: [1, 2], out: [1, 3] },
    explain: "With paternal UPD both chromosomes 15 come from the father: every allele must be paternal, inside and outside the critical region (either the father's two alleles, or one of them twice as a tall peak).",
  },
  {
    diag: 'imprint', hide: 'gel', reverse: false, fam: F3, child: { crit: [4, 1], out: [1, 4] },
    explain: 'Both alleles carry a paternal (unmethylated) imprint: Xba I alone gives a thick 4.2 kb band, and Not I cuts both copies, leaving only a thick 0.9 kb band.',
  },
  {
    diag: 'ube3a', hide: 'diag', reverse: false, fam: F2, child: { crit: [5, 1], out: [2, 1] },
    explain: 'The Southern blot is normal and the child has one allele from each parent: methylation and inheritance are both normal, so the remaining cause is a point mutation in UBE3A.',
  },
  {
    diag: 'imprint', hide: 'ms', reverse: false, fam: F2, child: { crit: [5, 3], out: [2, 4] },
    explain: 'An imprinting error does not change inheritance: the child carries one allele from each parent, in both regions.',
  },
  {
    diag: 'upd', hide: 'gel', reverse: true, fam: F3, child: { crit: [4, 4], out: [1, 5] },
    explain: 'With the reverse probe the unmethylated fragment is 3.3 kb. Two unmethylated paternal copies give a thick 4.2 kb band with Xba I, then a single thick 3.3 kb band after Not I.',
  },
  {
    diag: 'imprint', hide: 'diag', reverse: true, fam: F1, child: { crit: [2, 4], out: [3, 2] },
    explain: 'No methylated band (only a thick 3.3 kb band after Not I), yet one allele from each parent: imprinting error.',
  },
  {
    diag: 'del', hide: 'ms', reverse: true, fam: F2, child: { crit: [2], out: [2, 1] },
    explain: 'In the critical region only one paternal allele is left (a single small peak). Outside the region, both parents contribute.',
  },
]

const HIDE_LABEL = { gel: 'Southern blot', ms: 'Microsatellites', diag: 'Diagnosis' }
const TOKENS = {
  gel: [{ v: 1, label: 'Thin band' }, { v: 2, label: 'Thick band' }],
  ms: [{ v: 1, label: 'Small peak' }, { v: 2, label: 'Tall peak' }],
}

/* ---------- Grading ---------- */
const toAlleles = (counts) =>
  Object.entries(counts).flatMap(([p, n]) => Array(n).fill(Number(p)))

// Microsatellites have several correct answers, so they are checked against rules
function regionOk(alleles, rule, F, M) {
  const [a, b] = alleles
  if (rule === 'single') return alleles.length === 1 && F.includes(a)
  if (alleles.length !== 2) return false
  if (rule === 'paternal') return F.includes(a) && F.includes(b)
  return (F.includes(a) && M.includes(b)) || (F.includes(b) && M.includes(a))
}

function msOk(c, ms) {
  const rule = (region) =>
    c.diag === 'upd' ? 'paternal' : c.diag === 'del' && region === 'crit' ? 'single' : 'biparental'
  return ['crit', 'out'].every((r) =>
    regionOk(toAlleles(ms[r]), rule(r), c.fam.father[r], c.fam.mother[r])
  )
}

const sameGel = (a, b) => a.every((lane, j) => lane.every((w, k) => w === b[j][k]))

function grade(c, a) {
  if (c.hide === 'diag') return a.diag === c.diag
  if (c.hide === 'gel') return sameGel(a.gel, GEL_BY_DIAG[c.diag])
  return msOk(c, a.ms)
}

function isComplete(c, a) {
  if (c.hide === 'diag') return !!a.diag
  if (c.hide === 'gel') return a.gel.some((lane) => lane.some(Boolean))
  return Object.keys(a.ms.crit).length > 0 && Object.keys(a.ms.out).length > 0
}

// Firestore rejects nested arrays, so answers are logged as strings
function answerString(c, a) {
  if (c.hide === 'diag') return a.diag
  if (c.hide === 'gel') return a.gel.map((lane) => lane.join('')).join('/')
  return ['crit', 'out'].map((r) => `${r}:${toAlleles(a.ms[r]).join(',')}`).join(' ')
}

const emptyAnswers = () =>
  CASES.map(() => ({ diag: '', gel: [[0, 0], [0, 0]], ms: { crit: {}, out: {} } }))

/* ---------- Part 2: relation graph ---------- */
const OBS_SB = [
  { id: 'sb-normal', short: 'SB: normal pattern', text: 'Methylated and unmethylated bands both present after Xba I + Not I (normal pattern)' },
  { id: 'sb-unmeth2', short: 'SB: no methylation, thick band', text: 'No methylated band: the unmethylated band is thick (two unmethylated copies)' },
  { id: 'sb-unmeth1', short: 'SB: no methylation, thin bands', text: 'No methylated band and every band is thin (only one copy left)' },
]
const OBS_MS = [
  { id: 'ms-bi', short: 'MS: one allele per parent', text: 'One allele from each parent, inside and outside the critical region' },
  { id: 'ms-pat', short: 'MS: paternal alleles only', text: 'Only paternal alleles, inside and outside the critical region' },
  { id: 'ms-single', short: 'MS: single allele in region', text: 'A single paternal allele in the critical region, one allele from each parent outside it' },
]
const OBS = Object.fromEntries([...OBS_SB, ...OBS_MS].map((o) => [o.id, o]))
const CORRECT_LINKS = new Set([
  'sb-normal>ube3a', 'sb-unmeth2>upd', 'sb-unmeth2>imprint', 'sb-unmeth1>del',
  'ms-bi>ube3a', 'ms-bi>imprint', 'ms-pat>upd', 'ms-single>del',
])

function linkPath(o, d) {
  const ox = o.x + o.w / 2, oy = o.y + o.h / 2
  const dx = d.x + d.w / 2, dy = d.y + d.h / 2
  if (Math.abs(dx - ox) > Math.abs(dy - oy)) {
    const sx = ox < dx ? o.x + o.w : o.x
    const ex = ox < dx ? d.x : d.x + d.w
    const mx = (sx + ex) / 2
    return `M${sx},${oy} C${mx},${oy} ${mx},${dy} ${ex},${dy}`
  }
  const sy = oy < dy ? o.y + o.h : o.y
  const ey = oy < dy ? d.y : d.y + d.h
  const my = (sy + ey) / 2
  return `M${ox},${sy} C${ox},${my} ${dx},${my} ${dx},${ey}`
}

function LinkGraph({ links, onToggle, locked, sbOrder, msOrder }) {
  const wrapRef = useRef(null)
  const nodeRefs = useRef({})
  const [geo, setGeo] = useState(null)
  const [sel, setSel] = useState(null)

  // Measure node boxes so the SVG links follow the responsive layout
  useEffect(() => {
    const wrap = wrapRef.current
    const ro = new ResizeObserver(() => {
      const box = wrap.getBoundingClientRect()
      const nodes = {}
      for (const [id, el] of Object.entries(nodeRefs.current)) {
        if (!el) continue
        const r = el.getBoundingClientRect()
        nodes[id] = { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height }
      }
      setGeo({ w: box.width, h: box.height, nodes })
    })
    ro.observe(wrap)
    Object.values(nodeRefs.current).forEach((el) => el && ro.observe(el))
    return () => ro.disconnect()
  }, [])

  const click = (id) => {
    if (locked) return
    const isDiag = !!DIAG[id]
    if (sel && !!DIAG[sel] !== isDiag) {
      onToggle(isDiag ? `${sel}>${id}` : `${id}>${sel}`)
      setSel(null)
    } else {
      setSel(sel === id ? null : id)
    }
  }

  const shown = locked ? [...new Set([...links, ...CORRECT_LINKS])] : links
  const linkState = (key) => {
    if (!locked) return ''
    if (!links.includes(key)) return 'missed'
    return CORRECT_LINKS.has(key) ? 'ok' : 'ko'
  }
  const linked = (id) => links.some((k) => k.split('>').includes(id))

  const node = (id, text, extra = '') => (
    <button
      key={id}
      type="button"
      ref={(el) => (nodeRefs.current[id] = el)}
      className={`node ${extra}${sel === id ? ' selected' : ''}${linked(id) ? ' linked' : ''}`}
      aria-pressed={sel === id}
      disabled={locked}
      onClick={() => click(id)}
    >
      {text}
    </button>
  )

  return (
    <>
      <div className={`graph${sel ? ' picking' : ''}`} ref={wrapRef}>
        {geo && (
          <svg className="graph-lines" width={geo.w} height={geo.h} aria-hidden="true">
            {shown.map((key) => {
              const [o, d] = key.split('>')
              if (!geo.nodes[o] || !geo.nodes[d]) return null
              return (
                <path key={key} d={linkPath(geo.nodes[o], geo.nodes[d])} className={`link ${linkState(key)}`} />
              )
            })}
          </svg>
        )}
        <div className="graph-col">
          <h4>Southern blot</h4>
          {sbOrder.map((o) => node(o.id, o.text, 'obs'))}
        </div>
        <div className="graph-col">
          <h4>Diagnosis</h4>
          {CHOICES.map((k) => node(k, DIAG[k], 'diag'))}
        </div>
        <div className="graph-col">
          <h4>Microsatellites</h4>
          {msOrder.map((o) => node(o.id, o.text, 'obs'))}
        </div>
      </div>

      <div className="link-list" aria-live="polite">
        <span className="link-list-title">Your links ({links.length})</span>
        {links.length === 0 && <span className="muted">None yet.</span>}
        {links.map((key) => {
          const [o, d] = key.split('>')
          return (
            <span key={key} className={`chip ${linkState(key)}`}>
              {OBS[o].short} → {DIAG[d]}
              {!locked && (
                <button type="button" aria-label={`Remove link ${OBS[o].short} to ${DIAG[d]}`} onClick={() => onToggle(key)}>
                  ×
                </button>
              )}
            </span>
          )
        })}
      </div>
    </>
  )
}

/* ---------- Part 1 widgets ---------- */
function TokenIcon({ kind, v }) {
  if (kind === 'gel') {
    return (
      <svg viewBox="0 0 44 18" width="44" height="18" aria-hidden="true">
        <rect width="44" height="18" rx="2" className="gel-bg" />
        <rect x="5" y={v === 2 ? 6 : 7.5} width="34" height={v === 2 ? 6 : 3} className="band" />
      </svg>
    )
  }
  const h = v === 2 ? 24 : 13
  return (
    <svg viewBox="0 0 24 30" width="24" height="30" aria-hidden="true">
      <line x1="0" y1="28" x2="24" y2="28" className="baseline" />
      <path d={`M6,28 C8,28 9,${28 - h} 12,${28 - h} C15,${28 - h} 16,28 18,28`} className="peak" />
    </svg>
  )
}

function Reserve({ kind, caseIdx, sel, onSelect, onDragStart }) {
  return (
    <div className="reserve" role="group" aria-label="Pieces to place">
      {TOKENS[kind].map((t) => {
        const active = sel?.caseIdx === caseIdx && sel.kind === kind && sel.v === t.v
        const token = { caseIdx, kind, v: t.v }
        return (
          <button
            key={t.v}
            type="button"
            className={`token${active ? ' active' : ''}`}
            aria-pressed={active}
            onClick={() => onSelect(active ? null : token)}
            onPointerDown={(e) => onDragStart(e, token)}
          >
            <TokenIcon kind={kind} v={t.v} />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Page ---------- */
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function Exam() {
  const startTime = useRef(0)
  const submitTime = useRef(null)
  const started = useRef(false)
  const justDragged = useRef(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (started.current) return
    started.current = true
    startTime.current = Date.now()
    logEvent('exam_started')
  }, [])

  const sbOrder = useMemo(() => shuffle(OBS_SB), [])
  const msOrder = useMemo(() => shuffle(OBS_MS), [])
  const [answers, setAnswers] = useState(emptyAnswers)
  const [links, setLinks] = useState([])
  const [sel, setSel] = useState(null) // token picked by click: { caseIdx, kind, v }
  const [ghost, setGhost] = useState(null) // token being dragged, with pointer position
  const [submitted, setSubmitted] = useState(false)

  const results = CASES.map((c, i) => grade(c, answers[i]))
  const part1Score = results.filter(Boolean).length
  const done = CASES.filter((c, i) => isComplete(c, answers[i])).length
  const graphCorrect = links.filter((k) => CORRECT_LINKS.has(k)).length
  const graphWrong = links.length - graphCorrect
  const graphScore = Math.max(0, graphCorrect - graphWrong)
  const ready = done === CASES.length && links.length > 0

  const update = (i, fn) =>
    setAnswers((prev) => prev.map((a, j) => (j === i ? fn(a) : a)))

  // v = 0 clears the slot
  const place = (i, kind, key, v) =>
    update(i, (a) => {
      if (kind === 'gel') {
        const [j, k] = key.split(':').map(Number)
        const gel = a.gel.map((lane) => [...lane])
        gel[j][k] = v
        return { ...a, gel }
      }
      const [r, p] = key.split(':')
      const region = { ...a.ms[r] }
      if (v) region[p] = v
      else delete region[p]
      return { ...a, ms: { ...a.ms, [r]: region } }
    })

  const current = (i, kind, key) => {
    const [x, y] = key.split(':')
    return kind === 'gel' ? answers[i].gel[x][y] : answers[i].ms[x][y] || 0
  }

  // Click on a slot: place the selected piece, or clear the slot
  const onSlot = (i, kind) => (key) => {
    if (submitted) return
    const armed = sel?.caseIdx === i && sel.kind === kind
    const v = armed && current(i, kind, key) !== sel.v ? sel.v : 0
    place(i, kind, key, v)
  }

  // Pointer drag (mouse and touch); a press without movement falls through to onClick
  const startDrag = (e, token) => {
    if (e.button !== 0 || submitted) return
    const sx = e.clientX
    const sy = e.clientY
    let moving = false
    const move = (ev) => {
      if (!moving && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return
      moving = true
      setGhost({ ...token, x: ev.clientX, y: ev.clientY })
    }
    const up = (ev) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      if (!moving) return
      setGhost(null)
      justDragged.current = true
      setTimeout(() => (justDragged.current = false), 0)
      const slot = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-slot]')
      if (!slot) return
      const [name, key] = slot.dataset.slot.split('|')
      if (name === `${token.caseIdx}-${token.kind}`) place(token.caseIdx, token.kind, key, token.v)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const selectToken = (t) => {
    if (!justDragged.current) setSel(t)
  }

  const toggleLink = (key) =>
    setLinks((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))

  const reset = () => {
    setAnswers(emptyAnswers())
    setLinks([])
    setSel(null)
  }

  const handleSubmit = () => {
    setSubmitted(true)
    setSel(null)
    submitTime.current = Date.now()
    logEvent('exam_submitted', {
      part1Score,
      part1Total: CASES.length,
      graphScore,
      graphCorrect,
      graphWrong,
      graphTotal: CORRECT_LINKS.size,
      links,
      totalSeconds: Math.round((submitTime.current - startTime.current) / 1000),
      answers: Object.fromEntries(
        CASES.map((c, i) => [
          String(i + 1),
          { hide: c.hide, diag: c.diag, given: answerString(c, answers[i]), correct: results[i] },
        ])
      ),
    })
  }

  const handleFinish = () => {
    logEvent('exam_finished', {
      reviewSeconds: Math.round((Date.now() - submitTime.current) / 1000),
    })
    navigate('/end')
  }

  const renderCase = (c, i) => {
    const a = answers[i]
    const ok = results[i]
    const gel = { father: NORMAL_GEL, mother: NORMAL_GEL, child: GEL_BY_DIAG[c.diag] }
    const ms = { ...c.fam, child: c.child }
    const edit = (kind) =>
      submitted
        ? null
        : {
            name: `${i}-${kind}`,
            value: a[kind],
            armed:
              (sel?.caseIdx === i && sel.kind === kind) ||
              (ghost?.caseIdx === i && ghost.kind === kind),
            onSlot: onSlot(i, kind),
          }

    // After submission, the student's answer stays visible and is drawn read-only
    const mine = (kind) => (submitted ? a[kind] : null)
    const gelFig =
      c.hide === 'gel' ? (
        <Gel
          gel={submitted ? { ...gel, child: mine('gel') } : gel}
          reverse={c.reverse}
          edit={edit('gel')}
        />
      ) : (
        <Gel gel={gel} reverse={c.reverse} />
      )
    const msFig =
      c.hide === 'ms' ? (
        <Microsat
          ms={submitted ? { ...ms, child: { crit: toAlleles(a.ms.crit), out: toAlleles(a.ms.out) } } : ms}
          edit={edit('ms')}
        />
      ) : (
        <Microsat ms={ms} />
      )

    return (
      <article key={i} className={`exo-case ${submitted ? (ok ? 'ok' : 'ko') : ''}`}>
        <header className="case-head">
          <h3>Case {i + 1}</h3>
          <span className="tag">Complete: {HIDE_LABEL[c.hide]}</span>
        </header>

        {c.hide !== 'diag' ? (
          <p className="given-diag">
            Diagnosis: <strong>{DIAG[c.diag]}</strong>
          </p>
        ) : (
          <p className="given-diag">This child has Angelman syndrome.</p>
        )}

        <div className="exo-figs">
          <figure className={c.hide === 'gel' ? 'to-fill' : ''}>
            <figcaption>Southern blot{c.hide === 'gel' && ' · complete the child'}</figcaption>
            {c.hide === 'gel' && !submitted && (
              <Reserve kind="gel" caseIdx={i} sel={sel} onSelect={selectToken} onDragStart={startDrag} />
            )}
            {gelFig}
          </figure>
          <figure className={c.hide === 'ms' ? 'to-fill' : ''}>
            <figcaption>Microsatellites{c.hide === 'ms' && ' · complete the child'}</figcaption>
            {c.hide === 'ms' && !submitted && (
              <Reserve kind="ms" caseIdx={i} sel={sel} onSelect={selectToken} onDragStart={startDrag} />
            )}
            {msFig}
          </figure>
        </div>

        {c.hide === 'diag' && (
          <fieldset className="diag-choices" disabled={submitted}>
            <legend>Diagnosis</legend>
            {CHOICES.map((k) => (
              <label key={k} className={a.diag === k ? 'checked' : ''}>
                <input
                  type="radio"
                  name={`diag-${i}`}
                  value={k}
                  checked={a.diag === k}
                  onChange={() => update(i, (prev) => ({ ...prev, diag: k }))}
                />
                {DIAG[k]}
              </label>
            ))}
          </fieldset>
        )}

        {submitted && (
          <div className="correction">
            <p className="exo-verdict" role="status">{ok ? 'Correct.' : 'Not quite.'}</p>
            {!ok && c.hide === 'gel' && (
              <figure className="expected">
                <figcaption>Expected Southern blot</figcaption>
                <Gel gel={gel} reverse={c.reverse} />
              </figure>
            )}
            {!ok && c.hide === 'ms' && (
              <figure className="expected">
                <figcaption>One correct microsatellite profile</figcaption>
                <Microsat ms={ms} />
              </figure>
            )}
            <p className="exo-explain">
              <strong>{DIAG[c.diag]}.</strong> {c.explain}
            </p>
          </div>
        )}
      </article>
    )
  }

  return (
    <main className="page exo exam">
      <section className="top">
        <div className="top-text">
          <h1>Exam · Angelman syndrome</h1>
          <p>
            Two parts. First, 9 cases where one piece is missing: the Southern blot,
            the microsatellites or the diagnosis. Then, link the observations to the
            diagnoses they point to. You submit once, at the end, and then see the
            correction.
          </p>

          <details className="exo-help">
            <summary>How to answer</summary>
            <ul>
              <li>
                Southern blot and microsatellites: drag a piece (thin or thick band,
                small or tall peak) onto the child&apos;s dashed slots. You can also
                click a piece, then click the slots. Clicking a filled slot empties it.
              </li>
              <li>
                A tall peak means two copies of the same allele. A thick band means
                two copies of the fragment.
              </li>
              <li>Diagnosis: choose one answer.</li>
            </ul>
          </details>

          <h2 className="part-title">Part 1 · Complete the missing piece</h2>

          <section className="exo-probe">
            <figure>
              <figcaption>Cases 1 to 6: standard probe</figcaption>
              <ProbeMap />
            </figure>
            <p>
              The probe binds between the first Xba I site and the Not I site. Xba I
              alone gives 4.2 kb. When Not I can cut (unmethylated site), the probe
              sees a 0.9 kb fragment.
            </p>
          </section>
          <div className="exo-cases">{CASES.slice(0, 6).map((c, i) => renderCase(c, i))}</div>

          <section className="exo-probe reverse-probe">
            <figure>
              <figcaption>Cases 7 to 9: reverse probe</figcaption>
              <ProbeMap reverse />
            </figure>
            <p>
              The probe now binds on the other side of the Not I site. Xba I alone
              still gives 4.2 kb, but when Not I cuts, the probe sees a 3.3 kb
              fragment.
            </p>
          </section>
          <div className="exo-cases">{CASES.slice(6).map((c, i) => renderCase(c, i + 6))}</div>

          <h2 className="part-title">Part 2 · Build the diagnosis map</h2>
          <p className="part-intro">
            Each diagnosis is identified by one Southern blot observation and one
            microsatellite observation. Click an observation, then a diagnosis, to
            link them (or the other way round). Click the same pair again to remove
            the link. An observation can lead to several diagnoses.
          </p>
          <LinkGraph
            links={links}
            onToggle={toggleLink}
            locked={submitted}
            sbOrder={sbOrder}
            msOrder={msOrder}
          />
          {submitted && (
            <p className="graph-legend">
              <span className="lg ok">correct link</span>
              <span className="lg ko">wrong link</span>
              <span className="lg missed">missing link</span>
            </p>
          )}

          {!submitted ? (
            <div className="exo-actions">
              <button className="cta" type="button" disabled={!ready} onClick={handleSubmit}>
                Submit the exam
              </button>
              <button className="exo-btn" type="button" onClick={reset}>
                Start over
              </button>
              <span className="progress">
                {done} / {CASES.length} cases completed · {links.length} link{links.length === 1 ? '' : 's'}
              </span>
            </div>
          ) : (
            <>
              <p className="exo-score" role="status">
                Part 1: {part1Score} / {CASES.length} correct · Part 2: {graphCorrect} /{' '}
                {CORRECT_LINKS.size} links found, {graphWrong} wrong
              </p>
              <button className="cta" type="button" onClick={handleFinish}>
                Finish
              </button>
            </>
          )}
        </div>
      </section>

      {ghost && (
        <div className="drag-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          <TokenIcon kind={ghost.kind} v={ghost.v} />
        </div>
      )}
    </main>
  )
}

export default Exam
