import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { recordFeedback } from '../tracker'
import './Feedback.css'

const QUESTION = 'What do you think is the main mechanism that helped you understand the subject?'

function Feedback() {
  const navigate = useNavigate()
  const [answer, setAnswer] = useState('')

  const next = () => {
    recordFeedback(QUESTION, answer.trim())
    navigate('/end')
  }

  return (
    <main className="page feedback">
      <section className="top">
        <div className="top-text">
          <h1>One last question</h1>
          <label htmlFor="feedback-answer">{QUESTION}</label>
          <textarea
            id="feedback-answer"
            rows="6"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <button className="cta" type="button" onClick={next}>
            Next
          </button>
        </div>
      </section>
    </main>
  )
}

export default Feedback
