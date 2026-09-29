import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  return (
    <main className="page">
      <section className="top">
        <div className="top-text">
          <h1>Learn to diagnose Angelman and Prader-Willi syndromes</h1>

          <p>
            Find out how Southern blotting and microsatellite analysis reveal
            the changes on chromosome 15 behind these two conditions.
          </p>

          <button
            className="cta"
            type="button"
            onClick={() => navigate('/learn')}
          >
            Start learning
          </button>
        </div>
      </section>
    </main>
  )
}

export default Home