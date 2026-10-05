import { useNavigate } from 'react-router-dom'
import './Learn.css'

/* ---------- Content ---------- */
const MECHANISMS = [
  {
    kind: 'del',
    title: 'Maternal deletion',
    freq: 'about 70% of cases',
    text: 'A segment of the maternal chromosome 15 that contains UBE3A is missing. The paternal copy is silenced in neurons, so no active copy is left.',
  },
  {
    kind: 'ube3a',
    title: 'Point mutation of UBE3A',
    freq: 'about 10% of cases',
    text: 'The maternal copy is present and active, but a mutation in its sequence makes the protein non-functional.',
  },
  {
    kind: 'upd',
    title: 'Paternal uniparental disomy',
    freq: 'about 5% of cases',
    text: 'The child inherits both copies of chromosome 15 from the father and none from the mother. Both copies are silenced.',
  },
  {
    kind: 'imprint',
    title: 'Imprinting error',
    freq: 'about 3% of cases',
    text: 'The child inherits one chromosome 15 from each parent, but the maternal copy carries the paternal imprint and is silenced.',
  },
]

const SUMMARY = [
  { cause: 'Point mutation of UBE3A', blot: 'Methylation present (4.2 kb + 0.9 kb)', ms: 'Both parents contribute' },
  { cause: 'Maternal deletion', blot: 'Methylation absent, bands at half intensity', ms: 'No maternal allele in the critical region only' },
  { cause: 'Paternal uniparental disomy', blot: 'Methylation absent', ms: 'Only paternal alleles, everywhere' },
  { cause: 'Imprinting error', blot: 'Methylation absent', ms: 'Both parents contribute' },
]

/* ---------- Figure: chromosomes 15 and the UBE3A copy ---------- */
function Chromosomes({ kind }) {
  // each chromosome: whose DNA it is (mat/pat) and the state of its UBE3A copy
  const cfg = {
    normal: { top: ['mat', 'active'], bottom: ['pat', 'silent'] },
    del: { top: ['mat', 'deleted'], bottom: ['pat', 'silent'] },
    ube3a: { top: ['mat', 'mutated'], bottom: ['pat', 'silent'] },
    upd: { top: ['pat', 'silent'], bottom: ['pat', 'silent'] },
    imprint: { top: ['mat', 'silent'], bottom: ['pat', 'silent'] },
  }[kind]

  const rows = [
    { y: 16, label: 'Maternal chromosome', owner: cfg.top[0], state: cfg.top[1] },
    { y: 60, label: 'Paternal chromosome', owner: cfg.bottom[0], state: cfg.bottom[1] },
  ]
  // for UPD the top chromosome is not maternal at all
  const label = (r, i) => (kind === 'upd' && i === 0 ? 'Second paternal chromosome' : r.label)

  return (
    <svg viewBox="0 0 220 96" role="img" aria-label={kind} className="learn-fig chromo">
      {rows.map((r, i) => (
        <g key={i}>
          <text x="10" y={r.y - 4} className="fig-txt small">{label(r, i)}</text>
          {r.state === 'deleted' ? (
            <>
              <rect x="10" y={r.y} width="85" height="12" rx="6" className={`chr ${r.owner}`} />
              <rect x="125" y={r.y} width="85" height="12" rx="6" className={`chr ${r.owner}`} />
              <rect x="97" y={r.y} width="26" height="12" className="chr-gap" />
            </>
          ) : (
            <rect x="10" y={r.y} width="200" height="12" rx="6" className={`chr ${r.owner}`} />
          )}
          {r.state !== 'deleted' && (
            <circle
              cx="110"
              cy={r.y + 6}
              r="9"
              className={r.state === 'silent' ? 'gene silent' : 'gene active'}
            />
          )}
          {r.state === 'mutated' && (
            <path d={`M105,${r.y + 1} L115,${r.y + 11} M115,${r.y + 1} L105,${r.y + 11}`} className="gene-x" />
          )}
        </g>
      ))}
    </svg>
  )
}

/* ---------- Figure: where the probe binds (same as the exercise) ---------- */
function ProbeMap() {
  return (
    <svg viewBox="0 0 340 122" role="img" aria-label="Restriction map showing the probe" className="learn-fig">
      <line x1="20" y1="50" x2="320" y2="50" className="genome" />
      <line x1="40" y1="40" x2="40" y2="60" className="tick" />
      <line x1="94" y1="30" x2="94" y2="60" className="tick" />
      <line x1="290" y1="40" x2="290" y2="60" className="tick" />
      <text x="40" y="22" textAnchor="middle" className="fig-txt strong">Xba I</text>
      <text x="94" y="22" textAnchor="middle" className="fig-txt strong">Not I</text>
      <text x="290" y="22" textAnchor="middle" className="fig-txt strong">Xba I</text>
      <rect x="46" y="66" width="42" height="5" className="probe" />
      <text x="96" y="72" className="fig-txt probe-txt">Probe</text>
      <line x1="40" y1="88" x2="94" y2="88" className="span" />
      <text x="100" y="91" className="fig-txt">0.9 kb (Xba I + Not I)</text>
      <line x1="40" y1="106" x2="290" y2="106" className="span" />
      <text x="165" y="102" textAnchor="middle" className="fig-txt">4.2 kb (Xba I alone)</text>
    </svg>
  )
}

/* ---------- Figure: microsatellite peaks, one marker ---------- */
function Peak({ x, base, h }) {
  return (
    <path
      d={`M${x - 6},${base} C${x - 4},${base} ${x - 3},${base - h} ${x},${base - h} C${x + 3},${base - h} ${x + 4},${base} ${x + 6},${base}`}
      className="peak"
    />
  )
}

function MicrosatDemo() {
  // alleles are positions along the size axis
  const rows = [
    ['Father', [1, 2]],
    ['Mother', [3, 4]],
    ['Child', [1, 4]],
  ]
  const xOf = (a) => 70 + a * 50
  return (
    <svg viewBox="0 0 340 200" role="img" aria-label="Example of a microsatellite analysis" className="learn-fig">
      {rows.map(([name, alleles], i) => {
        const base = 50 + i * 62
        return (
          <g key={name}>
            <text x="2" y={base - 24} className="fig-txt strong">{name}</text>
            <line x1="52" y1={base} x2="332" y2={base} className="baseline" />
            {alleles.map((a) => (
              <Peak key={a} x={xOf(a)} base={base} h={34} />
            ))}
          </g>
        )
      })}
      <text x="332" y="196" textAnchor="end" className="fig-txt small">fragment size →</text>
      <line x1={xOf(1)} y1="8" x2={xOf(1)} y2="176" className="divider" />
      <line x1={xOf(4)} y1="8" x2={xOf(4)} y2="176" className="divider" />
    </svg>
  )
}

/* ---------- Figure: Southern blot, same drawing rules as the exercise ---------- */
function GelDemo() {
  // lane = [4.2 kb, 0.9 kb]; 0 none, 1 thin, 2 thick
  const people = [
    ['Parent', [[2, 0], [1, 1]]],
    ['Normal child', [[2, 0], [1, 1]]],
    ['No methylation', [[2, 0], [0, 2]]],
  ]
  const yBand = [42, 112]
  return (
    <svg viewBox="0 0 340 170" role="img" aria-label="Southern blot example" className="learn-fig">
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

/* ---------- Page ---------- */
function Learn() {
  const navigate = useNavigate()

  return (
    <main className="page learn">
      <section className="top">
        <div className="top-text">
          <h1>Angelman syndrome</h1>
          <p className="learn-lead">
            A rare genetic disease of the nervous system, caused by the loss of
            one gene on chromosome 15. This lesson shows how four different
            molecular causes can be told apart in the lab.
          </p>

          <nav className="learn-toc" aria-label="In this lesson">
            <a href="#disease">The disease</a>
            <a href="#mechanisms">Four mechanisms</a>
            <a href="#microsatellites">Microsatellites</a>
            <a href="#southern">Southern blot</a>
            <a href="#together">Putting it together</a>
          </nav>

          {/* ---- The disease ---- */}
          <section id="disease" className="learn-sec">
            <h2>The disease</h2>
            <p>
              Angelman syndrome affects about 1 child in 15,000. Babies look
              healthy at birth, then development slows down. The main signs are
              severe intellectual disability, almost no speech, poor balance and
              jerky movements, epilepsy, and a cheerful manner with frequent
              laughter.
            </p>
            <p>
              The cause is the loss of function of a single gene, <em>UBE3A</em>,
              located in the region 15q11-q13. The gene is subject to
              <strong> genomic imprinting</strong>: in neurons, only the copy
              inherited from the mother is active. The paternal copy is
              switched off, whatever its sequence.
            </p>
            <p>
              A child therefore has Angelman syndrome whenever the maternal
              copy is missing, mutated, or silenced.
            </p>
            <figure className="learn-figure">
              <figcaption>Normal situation in a neuron</figcaption>
              <Chromosomes kind="normal" />
              <p className="learn-key">
                <span className="swatch active" /> active copy
                <span className="swatch silent" /> silenced copy
              </p>
            </figure>
          </section>

          {/* ---- Four mechanisms ---- */}
          <section id="mechanisms" className="learn-sec">
            <h2>Four genetic mechanisms</h2>
            <p>
              Four events can leave a child without a working maternal copy of
              UBE3A. The percentages are approximate and vary between studies;
              in a small share of patients no cause is found.
            </p>
            <div className="learn-mech">
              {MECHANISMS.map((m) => (
                <article key={m.kind} className="learn-card">
                  <h3>{m.title}</h3>
                  <p className="learn-freq">{m.freq}</p>
                  <Chromosomes kind={m.kind} />
                  <p>{m.text}</p>
                </article>
              ))}
            </div>
            <p>
              Two laboratory analyses, used together, are enough to tell these
              four causes apart: a <strong>microsatellite analysis</strong> and a{' '}
              <strong>Southern blot</strong>. The next two chapters explain how
              each one works.
            </p>
          </section>

          {/* ---- Microsatellites ---- */}
          <section id="microsatellites" className="learn-sec">
            <h2>Microsatellite analysis</h2>
            <h3>What is a microsatellite?</h3>
            <p>
              A microsatellite is a short sequence, usually 2 to 5 bases, that
              is repeated several times in a row, for example CACACACA. The
              number of repeats varies a lot from one person to another, so each
              marker exists in several versions, called alleles. Everyone
              inherits one allele from each parent.
            </p>
            <h3>How it is measured</h3>
            <p>
              The region around a marker is copied by PCR with a fluorescent
              primer. The fragments are then separated by size. Each allele
              appears as one peak, and the position of the peak gives the number
              of repeats.
            </p>
            <figure className="learn-figure">
              <figcaption>One marker in a family</figcaption>
              <MicrosatDemo />
            </figure>
            <h3>How to read it</h3>
            <ul className="learn-list">
              <li>
                Two peaks: the person is heterozygous. Two alleles of different
                sizes were amplified.
              </li>
              <li>
                One tall peak: the person is homozygous, with two identical
                alleles stacked in the same place.
              </li>
              <li>
                Compare the child with each parent. In the example, the child
                carries allele 1 from the father and allele 4 from the mother,
                so both parents contribute.
              </li>
            </ul>
            <h3>What it tells us about Angelman syndrome</h3>
            <p>
              Two markers are used: one inside the critical region 15q11-q13
              and one outside it. Comparing them answers two questions.
            </p>
            <ul className="learn-list">
              <li>
                <strong>Is the maternal allele missing inside the critical
                region only?</strong> The child shows a single peak there but
                both parents contribute outside: this is a maternal deletion.
              </li>
              <li>
                <strong>Is the maternal allele missing everywhere?</strong> All
                the child's alleles come from the father: this is paternal
                uniparental disomy.
              </li>
              <li>
                <strong>Do both parents contribute?</strong> The microsatellites
                alone cannot separate a point mutation from an imprinting error.
              </li>
            </ul>
            <p className="learn-note">
              A marker is only useful if the parents carry different alleles. If
              they share the same allele, the result cannot show where the
              child's allele came from.
            </p>
          </section>

          {/* ---- Southern blot ---- */}
          <section id="southern" className="learn-sec">
            <h2>Southern blot</h2>
            <h3>The idea</h3>
            <p>
              Imprinting works through DNA methylation. At the imprinting site
              analysed here, the maternal allele is methylated and the paternal
              allele is not. The Southern blot reads this methylation, which
              microsatellites cannot see.
            </p>
            <h3>The steps</h3>
            <ol className="learn-list">
              <li>The patient's DNA is cut with Xba I, or with Xba I and Not I together.</li>
              <li>The fragments are separated by size on a gel.</li>
              <li>They are transferred to a membrane.</li>
              <li>A labelled probe binds to the region of interest, so only the fragments that contain it become visible.</li>
            </ol>
            <h3>Why two enzymes</h3>
            <p>
              Xba I always cuts, on both sides of the probe, which gives a
              4.2 kb fragment. Not I cuts only if its site is{' '}
              <strong>unmethylated</strong>. When it cuts, the fragment seen by
              the probe is shortened to 0.9 kb.
            </p>
            <figure className="learn-figure">
              <figcaption>Where the probe binds</figcaption>
              <ProbeMap />
            </figure>
            <h3>How to read it</h3>
            <p>
              Look at the lane with both enzymes. A healthy person has one
              methylated allele (it stays at 4.2 kb) and one unmethylated
              allele (it drops to 0.9 kb), so both bands appear. If the 4.2 kb
              band is missing, there is no methylated allele, which means the
              maternal imprint is absent.
            </p>
            <figure className="learn-figure">
              <figcaption>Normal pattern and absence of methylation</figcaption>
              <GelDemo />
            </figure>
            <p className="learn-note">
              A thinner band than in the parents reflects a lower amount of DNA.
              A child with a deletion has only one copy of the region, so every
              band is about half as intense.
            </p>
          </section>

          {/* ---- Together ---- */}
          <section id="together" className="learn-sec">
            <h2>Putting it together</h2>
            <p>
              Start with the Southern blot: is there methylation? If yes, the
              imprint is normal and the cause is probably a point mutation in
              UBE3A. If not, use the microsatellites to find which of the three
              remaining causes it is.
            </p>
            <div className="learn-table-wrap">
              <table className="learn-table">
                <caption className="sr-only">Expected results for each cause</caption>
                <thead>
                  <tr>
                    <th scope="col">Cause</th>
                    <th scope="col">Southern blot</th>
                    <th scope="col">Microsatellites</th>
                  </tr>
                </thead>
                <tbody>
                  {SUMMARY.map((r) => (
                    <tr key={r.cause}>
                      <th scope="row">{r.cause}</th>
                      <td>{r.blot}</td>
                      <td>{r.ms}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <button
            className="cta"
            type="button"
            onClick={() => navigate('/exo')}
          >
            Start the exercise
          </button>
        </div>
      </section>
    </main>
  )
}

export default Learn
