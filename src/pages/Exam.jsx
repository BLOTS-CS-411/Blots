import { useNavigate } from 'react-router-dom'

function Exam() {
  const navigate = useNavigate()
  return (
    <main className="page">
      <section className="top">
        <div className="top-text">
          <h1>Start Learning</h1>

          <p>
            Hello wow
          </p>
          <button
            className="cta"
            type="button"
            onClick={() => navigate('/end')}
          >
            Start learning
          </button>
        </div>
      </section>
    </main>
  )
}

export default Exam