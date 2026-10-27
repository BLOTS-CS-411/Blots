import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logEvent } from '../logger'
import './Pretest.css'

const DONT_KNOW = -1

/* ---------- Small microsatellite figure (same style as the Exo page) ---------- */
const PEAK_DATA = {
  Father: [1, 2],
  Mother: [3, 4],
  Child: [1, 4],
}

function MicrosatFigure() {
  const xOf = (a) => 70 + a * 40
  return (
    <svg
      viewBox="0 0 300 170"
      role="img"
      aria-label="Microsatellite analysis in the critical region for a father, a mother and a child"
      style={{ width: '100%', maxWidth: 420, display: 'block', margin: '0.5rem 0' }}
    >
      {Object.entries(PEAK_DATA).map(([name, alleles], i) => {
        const base = 64 + i * 50
        return (
          <g key={name}>
            <text x="2" y={base - 6} fontSize="11" fill="currentColor">{name}</text>
            <line x1="52" y1={base} x2="292" y2={base} stroke="currentColor" strokeOpacity="0.5" />
            {alleles.map((a) => {
              const x = xOf(a)
              const h = 34
              return (
                <path
                  key={a}
                  d={`M${x - 6},${base} C${x - 4},${base} ${x - 3},${base - h} ${x},${base - h} C${x + 3},${base - h} ${x + 4},${base} ${x + 6},${base}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

/* answer = index of the correct option (used for scoring/logging only, never shown)
   weight = points out of 100 (all weights sum to 100) */
const QUESTIONS = [
  {
    id: 'dna-structure',
    topic: 'DNA structure',
    weight: 5,
    q: 'Which statement best describes the structure of DNA?',
    options: [
      'A single strand made of amino acids',
      'Two strands twisted into a double helix, held together by paired bases',
      'A single strand made of sugars only',
      'Two strands that are identical copies of each other',
    ],
    answer: 1,
  },
  {
    id: 'dna',
    topic: 'DNA',
    weight: 5,
    q: 'What is DNA primarily responsible for?',
    options: [
      'Storing genetic information',
      'Producing energy',
      'Digesting food',
      'Producing NaCl',
    ],
    answer: 0,
  },
  {
    id: 'allele',
    topic: 'Alleles',
    weight: 10,
    q: 'What is an allele?',
    options: [
      'A type of chromosome',
      'A different version of the same gene',
      'A protein made from a gene',
      'A gene found only in females',
    ],
    answer: 1,
  },
  {
    id: 'chromosomes',
    topic: 'Chromosomes',
    weight: 10,
    q: 'A typical human body cell has 46 chromosomes. How are they organised?',
    options: [
      '46 different chromosomes, all inherited from the mother',
      '23 pairs: one chromosome of each pair from the mother, one from the father',
      '23 pairs, all inherited from the father',
      '2 large chromosomes that each carry 23 genes',
    ],
    answer: 1,
  },
  {
    id: 'mendel-cross',
    topic: 'Mendelian inheritance',
    weight: 15,
    q: 'Two parents are both heterozygous (Aa) for a gene, meaning each carries one dominant allele (A) and one recessive allele (a). What is the probability that a child is aa?',
    options: ['0', '1/4', '1/2', '3/4'],
    answer: 1,
  },
  {
    id: 'angelman',
    topic: 'Angelman syndrome',
    weight: 15,
    q: 'What is Angelman syndrome?',
    options: [
      'a syndrome where you have abdominal pain, bloating, diarrhea or constipations.',
      'a syndrome where you have weight gain around the abdomen and face, muscle weakness and high blood pressure.',
      'a syndrome where you have severe developmental delay and absence or very limited speech.',
      'a syndrome where you have unusually flexible joints, stretchy or fragile skin and joint pain.',
    ],
    answer: 2,
  },
  {
    id: 'prader-willi',
    topic: 'Prader-Willi syndrome',
    weight: 15,
    q: 'What is Prader-willi syndrome?',
    options: [
      'a syndrome where you are constantly hungry.',
      'a syndrome where you have an uncomfortable urge to move your legs.',
      'a syndrome where you have a characteristic facial features, short stature and heart defects.',
      'a syndrome in which a person believes they are dead, do not exist, or have lost their organs or blood.',
    ],
    answer: 0,
  },
  {
    id: 'microsat-graph',
    topic: 'Reading a microsatellite graph',
    weight: 15,
    q: 'In the graph below, each peak is one allele. Looking at the child, where do the two alleles come from?',
    figure: <MicrosatFigure />,
    options: [
      'Both alleles come from the father',
      'Both alleles come from the mother',
      'One allele comes from the father and one from the mother',
      'Neither allele matches a parent',
    ],
    answer: 2,
  },
]

const MAX_SCORE = QUESTIONS.reduce((sum, q) => sum + q.weight, 0) // 100

function Pretest() {
  const navigate = useNavigate()
  const [answers, setAnswers] = useState({}) // { questionId: optionIndex | -1 }

  const answered = Object.keys(answers).length
  const allDone = answered === QUESTIONS.length

  const choose = (id, value) => setAnswers((a) => ({ ...a, [id]: value }))

  const next = () => {
    const correct = QUESTIONS.filter((q) => answers[q.id] === q.answer)
    const score = correct.reduce((sum, q) => sum + q.weight, 0) // out of 100
    logEvent('pretest_completed', {
      answers,
      score,                       // weighted score out of 100
      total: MAX_SCORE,            // 100
      correctCount: correct.length,
      correctIds: correct.map((q) => q.id),
      dontKnow: QUESTIONS.filter((q) => answers[q.id] === DONT_KNOW).length,
    })
    navigate('/learn')
  }

  return (
    <main className="page pretest">
      <section className="top">
        <div className="top-text">
          <h1>What do you already know?</h1>
          <p>
            {QUESTIONS.length} questions on genetics.
          </p>

          <div
            className="pretest-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={QUESTIONS.length}
            aria-valuenow={answered}
            aria-label="Questions answered"
          >
            <div
              className="pretest-progress-bar"
              style={{ width: `${(answered / QUESTIONS.length) * 100}%` }}
            />
          </div>
          <p className="pretest-count">{answered} of {QUESTIONS.length} answered</p>

          <ol className="pretest-list">
            {QUESTIONS.map((q, qi) => (
              <li key={q.id}>
                <fieldset className="pretest-q">
                  <legend>
                    <span className="pretest-topic">{q.topic}</span>
                    <span className="pretest-text">{qi + 1}. {q.q}</span>
                  </legend>

                  {q.figure}

                  {q.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className={`pretest-opt ${answers[q.id] === oi ? 'on' : ''}`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === oi}
                        onChange={() => choose(q.id, oi)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}

                  <label
                    className={`pretest-opt dk ${answers[q.id] === DONT_KNOW ? 'on' : ''}`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === DONT_KNOW}
                      onChange={() => choose(q.id, DONT_KNOW)}
                    />
                    <span>I don’t know</span>
                  </label>
                </fieldset>
              </li>
            ))}
          </ol>

          <button
            className="cta"
            type="button"
            disabled={!allDone}
            onClick={next}
          >
            Continue to the lesson
          </button>
          {!allDone && (
            <p className="pretest-hint">Answer every question to continue.</p>
          )}
        </div>
      </section>
    </main>
  )
}

export default Pretest