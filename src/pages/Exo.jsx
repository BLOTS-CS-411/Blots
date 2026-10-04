import { useEffect, useMemo, useRef, useState } from 'react'
import { logEvent } from '../logger'
import { useNavigate } from 'react-router-dom'
import './Exo.css'

/* ---------- Interpretations (translated from the course PDF) ---------- */
const INTERPRETATIONS = [
  { key: 'ube3a', label: 'Point mutation of the UBE3A gene' },
  { key: 'upd', label: 'Paternal uniparental disomy' },
  { key: 'del', label: 'Maternal deletion' },
  { key: 'imprint', label: 'Imprinting error' },
]

/* ---------- Data for each case ----------
   gel: per person, [XbaI lane, XbaI+NotI lane], each lane = [4.2 kb, 0.9 kb]
        0 = no band, 1 = thin band, 2 = thick band
   ms:  allele positions per marker (same number = homozygous, merged in one tall peak) */
const PARENT_GEL = { father: [[2, 0], [1, 1]], mother: [[2, 0], [1, 1]] }
const PARENT_MS = {
  father: { crit: [1, 2], out: [1, 3] },
  mother: { crit: [3, 4], out: [2, 2] },
}

const CASES = [
  {
    answer: 'ube3a',
    gel: { ...PARENT_GEL, child: [[2, 0], [1, 1]] },
    ms: { ...PARENT_MS, child: { crit: [1, 4], out: [1, 2] } },
    explain:
      'Southern blot: normal. The child has the same 4.2 kb + 0.9 kb pattern as the parents, so the methylated maternal allele is present. Microsatellites: both parents contribute in the critical region, which rules out a maternal deletion and a paternal UPD. Remaining explanation: a point mutation in UBE3A.',
  },
  {
    answer: 'upd',
    gel: { ...PARENT_GEL, child: [[2, 0], [0, 2]] },
    ms: { ...PARENT_MS, child: { crit: [1, 2], out: [1, 3] } },
    explain:
      "Southern blot: 0% of the DNA is methylated (only the 0.9 kb band remains after Xba I + Not I). Microsatellites: the child's alleles are the father's alleles, with no maternal contribution.",
  },
  {
    answer: 'del',
    gel: { ...PARENT_GEL, child: [[1, 0], [0, 1]] },
    ms: { ...PARENT_MS, child: { crit: [1], out: [1, 2] } },
    explain:
      "Southern blot: the child's band intensity is 50% of the parents', and methylation is absent. Microsatellites: no maternal allele in the critical region (a single peak), while outside the region both parents contribute.",
  },
  {
    answer: 'imprint',
    gel: { ...PARENT_GEL, child: [[2, 0], [0, 2]] },
    ms: { ...PARENT_MS, child: { crit: [2, 3], out: [2, 3] } },
    explain:
      'Southern blot: methylation is absent. Microsatellites: both parents contribute.',
  },
]

/* ---------- Southern blot figure ---------- */
function Gel({ gel }) {
  const people = [
    ['Father', gel.father],
    ['Child', gel.child],
    ['Mother', gel.mother],
  ]
  const yBand = [42, 112]
  return (
    <svg viewBox="0 0 340 170" role="img" aria-label="Southern blot" className="exo-fig">
      <rect x="44" y="24" width="292" height="118" className="gel-bg" />
      <text x="2" y={yBand[0] + 3} className="fig-txt">4.2 kb</text>
      <text x="2" y={yBand[1] + 3} className="fig-txt">0.9 kb</text>
      {people.map(([name, lanes], i) => {
        const x0 = 50 + i * 95
        return (
          <g key={name}>
            <text x={x0 + 38} y="16" textAnchor="middle" className="fig-txt strong">{name}</text>
            {lanes.map((lane, j) => {
              const x = x0 + j * 42
              return (
                <g key={j}>
                  {lane.map((w, k) =>
                    w ? (
                      <rect
                        key={k}
                        x={x}
                        y={yBand[k] - (w === 2 ? 3 : 1.5)}
                        width="34"
                        height={w === 2 ? 6 : 3}
                        className="band"
                      />
                    ) : null
                  )}
                  <text x={x + 17} y="156" textAnchor="middle" className="fig-txt small">
                    {j === 0 ? 'Xba I' : '+ Not I'}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

/* ---------- Probe map ---------- */
function ProbeMap() {
  // 4.2 kb spans x = 40 to 290, so 0.9 kb is about 54 px
  return (
    <svg viewBox="0 0 340 122" role="img" aria-label="Restriction map showing the probe" className="exo-fig">
      <line x1="20" y1="50" x2="320" y2="50" className="genome" />
      {/* Xba I: short ticks. Not I: longer tick */}
      <line x1="40" y1="40" x2="40" y2="60" className="tick" />
      <line x1="94" y1="30" x2="94" y2="60" className="tick" />
      <line x1="290" y1="40" x2="290" y2="60" className="tick" />
      <text x="40" y="22" textAnchor="middle" className="fig-txt strong">Xba I</text>
      <text x="94" y="22" textAnchor="middle" className="fig-txt strong">Not I</text>
      <text x="290" y="22" textAnchor="middle" className="fig-txt strong">Xba I</text>
      {/* probe */}
      <rect x="46" y="66" width="42" height="5" className="probe" />
      <text x="96" y="72" className="fig-txt probe-txt">Probe</text>
      {/* fragment sizes */}
      <line x1="40" y1="88" x2="94" y2="88" className="span" />
      <text x="100" y="91" className="fig-txt">0.9 kb (Xba I + Not I)</text>
      <line x1="40" y1="106" x2="290" y2="106" className="span" />
      <text x="165" y="102" textAnchor="middle" className="fig-txt">4.2 kb (Xba I alone)</text>
    </svg>
  )
}

/* ---------- Microsatellite figure ---------- */
function Peaks({ alleles, base, xOf }) {
  const homo = alleles.length === 2 && alleles[0] === alleles[1]
  const list = homo ? [alleles[0]] : alleles
  const h = homo ? 54 : 34
  return list.map((a) => {
    const x = xOf(a)
    return (
      <path
        key={a}
        d={`M${x - 6},${base} C${x - 4},${base} ${x - 3},${base - h} ${x},${base - h} C${x + 3},${base - h} ${x + 4},${base} ${x + 6},${base}`}
        className="peak"
      />
    )
  })
}

function Microsat({ ms }) {
  const rows = [
    ['Father', ms.father],
    ['Mother', ms.mother],
    ['Child', ms.child],
  ]
  return (
    <svg viewBox="0 0 340 214" role="img" aria-label="Microsatellite analysis" className="exo-fig">
      <text x="120" y="10" textAnchor="middle" className="fig-txt strong">Critical region</text>
      <text x="120" y="22" textAnchor="middle" className="fig-txt">marker D15S128</text>
      <text x="255" y="10" textAnchor="middle" className="fig-txt strong">Outside critical region</text>
      <text x="255" y="22" textAnchor="middle" className="fig-txt">marker D15S165</text>
      <line x1="178" y1="2" x2="178" y2="212" className="divider" />
      {rows.map(([name, d], i) => {
        const base = 76 + i * 68
        return (
          <g key={name}>
            <text x="2" y={base - 6} className="fig-txt">{name}</text>
            <line x1="52" y1={base} x2="332" y2={base} className="baseline" />
            <Peaks alleles={d.crit} base={base} xOf={(a) => 60 + a * 20} />
            <Peaks alleles={d.out} base={base} xOf={(a) => 200 + a * 20} />
          </g>
        )
      })}
    </svg>
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

function Exo() {
  const startTime = useRef(Date.now())
  const started = useRef(false)
  const navigate = useNavigate()

  useEffect(() => {
  if (started.current) return
  started.current = true
  logEvent('session_started')
}, [])

  const order = useMemo(() => shuffle(CASES.map((_, i) => i)), [])
  const [picks, setPicks] = useState({})
  const [checked, setChecked] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const used = Object.values(picks)
  const allPicked = used.length === CASES.length
  const score = order.filter((id) => picks[id] === CASES[id].answer).length

  const pick = (id, key) => {
    setChecked(false)
    setPicks((p) => {
      const next = { ...p }
      if (key) next[id] = key
      else delete next[id]
      return next
    })
    if (key) {
      logEvent('case_answered', {
        case: 'ABCD'[order.indexOf(id)],   // position shown to participant
        caseId: id,                        // stable id of the case
        selected: key,
        correct: key === CASES[id].answer,
      })
    }

  }
  const reset = () => {
    setPicks({})
    setChecked(false)
    setRevealed(false)
  }
  const handleCheck = () => {
    setChecked(true)
    logEvent('check_answers', { score, total: CASES.length })
  }

  const handleReveal = () => {
    setRevealed(true)
    logEvent('answers_revealed', { usedShowAnswers: true })
  }

  const handleNext = () => {
    logEvent('session_completed', {
      finalScore: score,
      total: CASES.length,
      usedShowAnswers: revealed,
      totalSeconds: Math.round((Date.now() - startTime.current) / 1000),
    })
    navigate('/exam')
  }

  return (
    <main className="page exo">
      <section className="top">
        <div className="top-text">
          <h1>Exo · Angelman syndrome</h1>
          <p>
            4 children have Angelman syndrome (loss of function of a gene called UBE3A located on chromosome 15). For each one, read the Southern
            blot and the microsatellite analysis, then choose the right molecular cause.
          </p>

          <details className="exo-help">
            <summary>How to read the figures</summary>
            <ul>
              <li>
                Southern blot: Xba I cuts on both sides of the probe (4.2 kb). Not I
                cuts only when its site is unmethylated, giving the 0.9 kb band. In
                the parents, both bands appear after the double digest: one methylated
                allele and one unmethylated allele.
              </li>
              <li>
                Microsatellites: each peak is an allele. Compare the child's peaks with
                each parent's, inside and outside the critical region. A single tall
                peak means the person is homozygous for that marker.
              </li>
            </ul>
          </details>

          <section className="exo-probe">
            <figure>
              <figcaption>Where the probe binds</figcaption>
              <ProbeMap />
            </figure>
            <p>
              Xba I always cuts, giving a 4.2 kb fragment. Not I cuts only when its
              site is unmethylated, which shortens the fragment recognised by the
              probe to 0.9 kb.
            </p>
          </section>

          <div className="exo-cases">
            {order.map((id, n) => {
              const c = CASES[id]
              const ok = picks[id] === c.answer
              const state = checked && picks[id] ? (ok ? 'ok' : 'ko') : ''
              return (
                <article key={id} className={`exo-case ${state}`}>
                  <h2>Case {'ABCD'[n]}</h2>
                  <div className="exo-figs">
                    <figure>
                      <figcaption>Southern blot</figcaption>
                      <Gel gel={c.gel} />
                    </figure>
                    <figure>
                      <figcaption>Microsatellites</figcaption>
                      <Microsat ms={c.ms} />
                    </figure>
                  </div>

                  <label className="exo-pick">
                    <span>Interpretation</span>
                    <select
                      value={picks[id] || ''}
                      onChange={(e) => pick(id, e.target.value)}
                    >
                      <option value="">Choose…</option>
                      {INTERPRETATIONS.map((it) => (
                        <option
                          key={it.key}
                          value={it.key}
                          disabled={used.includes(it.key) && picks[id] !== it.key}
                        >
                          {it.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {checked && picks[id] && (
                    <p className="exo-verdict" role="status">
                      {ok ? 'Correct.' : 'Not quite. Look at the figures again.'}
                    </p>
                  )}
                  {(revealed || (checked && ok)) && (
                    <p className="exo-explain">
                      <strong>
                        {INTERPRETATIONS.find((i) => i.key === c.answer).label}.
                      </strong>{' '}
                      {c.explain}
                    </p>
                  )}
                </article>
              )
            })}
          </div>

          <div className="exo-actions">
            <button
              className="cta"
              type="button"
              disabled={!allPicked}
              onClick={handleCheck}
            >
              Check my answers
            </button>
            <button className="exo-btn" type="button" onClick={handleReveal}>
              Show answers
            </button>
            <button className="exo-btn" type="button" onClick={reset}>
              Start over
            </button>
          </div>

          {checked && (
            <p className="exo-score" role="status">
              {score} / {CASES.length} correct
            </p>
          )}

          <button className="cta" type="button" onClick={handleNext}>
            Next
          </button>
        </div>
      </section>
    </main>
  )
}

export default Exo
