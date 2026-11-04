import { downloadSessionFile } from '../tracker'

function End() {

  return (
    <main className="page">
      <section className="top">
        <div className="top-text">
          <h1>End</h1>
          <p>
            Thank you for taking part. You can download the file recorded during your
            session: your scores, the time spent on each phase and your interactions
            with the site. It does not contain the text you typed.
          </p>
          <button className="cta" type="button" onClick={downloadSessionFile}>
            Download my session file
          </button>
        </div>
      </section>
    </main>
  )
}

export default End
