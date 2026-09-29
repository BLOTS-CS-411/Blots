import { useNavigate } from 'react-router-dom'

function Exo() {
  const navigate = useNavigate()
  return (
    <main className="page">
      <section className="top">
        <div className="top-text">
          <h1>Start Learning</h1>

          <p>
            Hello
          </p>
          <button
            className="cta"
            type="button"
            onClick={() => navigate()}
          >
            Start learning
          </button>
        </div>
      </section>
    </main>
  )
}

export default Exo