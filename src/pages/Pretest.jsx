import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logEvent } from '../logger' // adjust to your logger file path
import './Pretest.css'

const DONT_KNOW = -1

/* answer = index of the correct option (used for logging only, never shown) */
const QUESTIONS = [
  {
    id: 'dna-structure',
    topic: 'DNA structure',
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
    id: 'base-pairing',
    topic: 'DNA structure',
    q: 'In DNA, which base pairs with adenine (A)?',
    options: ['Guanine (G)', 'Cytosine (C)', 'Thymine (T)', 'Uracil (U)'],
    answer: 2,
  },
  {
    id: 'dna',
    topic: 'DNA',
    q: 'What is DNA primarily responsable for?',
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
    q: 'Two parents are both heterozygous (Aa) for a gene. What is the probability that a child is aa?',
    options: ['0', '1/4', '1/2', '3/4'],
    answer: 1,
  },
]

function Pretest() {
  const navigate = useNavigate()
  const [answers, setAnswers] = useState({}) // { questionId: optionIndex | -1 }

  const answered = Object.keys(answers).length
  const allDone = answered === QUESTIONS.length

  const choose = (id, value) => setAnswers((a) => ({ ...a, [id]: value }))

  const next = () => {
    const score = QUESTIONS.filter((q) => answers[q.id] === q.answer).length
    logEvent('pretest_completed', {
      answers,
      score,
      total: QUESTIONS.length,
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
            Six questions on basic genetics.
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