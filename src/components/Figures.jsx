/* Shared figures for Exo and Exam (styles live in pages/Exo.css, scoped to .exo).
   Passing `edit` turns the child's lanes / row into drop slots:
   edit = { name, value, armed, onSlot(key) } */

const MS_POSITIONS = [1, 2, 3, 4, 5]

/* ---------- Drop slot ---------- */
function Slot({ edit, slotKey, label, ...rect }) {
  const activate = () => edit.onSlot(slotKey)
  return (
    <rect
      {...rect}
      data-slot={`${edit.name}|${slotKey}`}
      className={`slot${edit.armed ? ' armed' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          activate()
        }
      }}
    />
  )
}

/* ---------- Southern blot figure ----------
   gel: per person, [XbaI lane, XbaI+NotI lane], each lane = [4.2 kb, small band]
        0 = no band, 1 = thin band, 2 = thick band
   reverse: probe on the other side of Not I, the unmethylated band is 3.3 kb */
export function Gel({ gel, reverse = false, edit }) {
  const people = [
    ['Father', gel.father],
    ['Child', edit ? edit.value : gel.child],
    ['Mother', gel.mother],
  ]
  const yBand = reverse ? [42, 66] : [42, 112]
  const small = reverse ? '3.3 kb' : '0.9 kb'
  return (
    <svg viewBox="0 0 340 170" role="img" aria-label="Southern blot" className="exo-fig">
      <rect x="44" y="24" width="292" height="118" className="gel-bg" />
      <text x="2" y={yBand[0] + 3} className="fig-txt">4.2 kb</text>
      <text x="2" y={yBand[1] + 3} className="fig-txt">{small}</text>
      {people.map(([name, lanes], i) => {
        const x0 = 50 + i * 95
        const editable = edit && name === 'Child'
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
                  {editable &&
                    yBand.map((y, k) => (
                      <Slot
                        key={`s${k}`}
                        edit={edit}
                        slotKey={`${j}:${k}`}
                        label={`Child, ${j === 0 ? 'Xba I' : 'Xba I + Not I'} lane, ${k === 0 ? '4.2 kb' : small}${lane[k] ? `, ${lane[k] === 2 ? 'thick' : 'thin'} band` : ', empty'}`}
                        x={x - 3}
                        y={y - 9}
                        width="40"
                        height="18"
                      />
                    ))}
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
export function ProbeMap({ reverse = false }) {
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
      {reverse ? (
        <>
          <rect x="214" y="66" width="42" height="5" className="probe" />
          <text x="208" y="72" textAnchor="end" className="fig-txt probe-txt">Probe</text>
          <line x1="94" y1="88" x2="290" y2="88" className="span" />
          <text x="192" y="84" textAnchor="middle" className="fig-txt">3.3 kb (Xba I + Not I)</text>
        </>
      ) : (
        <>
          <rect x="46" y="66" width="42" height="5" className="probe" />
          <text x="96" y="72" className="fig-txt probe-txt">Probe</text>
          <line x1="40" y1="88" x2="94" y2="88" className="span" />
          <text x="100" y="91" className="fig-txt">0.9 kb (Xba I + Not I)</text>
        </>
      )}
      <line x1="40" y1="106" x2="290" y2="106" className="span" />
      <text x="165" y="102" textAnchor="middle" className="fig-txt">4.2 kb (Xba I alone)</text>
    </svg>
  )
}

/* ---------- Microsatellite figure ----------
   ms: allele positions per marker (same number twice = two copies, one tall peak) */
function Peaks({ alleles, base, xOf }) {
  const copies = {}
  alleles.forEach((a) => (copies[a] = (copies[a] || 0) + 1))
  return Object.entries(copies).map(([a, n]) => {
    const x = xOf(Number(a))
    const h = n >= 2 ? 54 : 34
    return (
      <path
        key={a}
        d={`M${x - 6},${base} C${x - 4},${base} ${x - 3},${base - h} ${x},${base - h} C${x + 3},${base - h} ${x + 4},${base} ${x + 6},${base}`}
        className="peak"
      />
    )
  })
}

// {pos: copies} -> [pos, pos, ...]
const toAlleles = (counts) =>
  Object.entries(counts).flatMap(([p, n]) => Array(n).fill(Number(p)))

export function Microsat({ ms, edit }) {
  const rows = [
    ['Father', ms.father],
    ['Mother', ms.mother],
    ['Child', edit ? { crit: toAlleles(edit.value.crit), out: toAlleles(edit.value.out) } : ms.child],
  ]
  const regions = [
    ['crit', (a) => 60 + a * 20, 'critical region'],
    ['out', (a) => 200 + a * 20, 'outside critical region'],
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
        const editable = edit && name === 'Child'
        return (
          <g key={name}>
            <text x="2" y={base - 6} className="fig-txt">{name}</text>
            <line x1="52" y1={base} x2="332" y2={base} className="baseline" />
            {regions.map(([r, xOf]) => (
              <Peaks key={r} alleles={d[r]} base={base} xOf={xOf} />
            ))}
            {editable &&
              regions.map(([r, xOf, regionLabel]) =>
                MS_POSITIONS.map((p) => {
                  const n = edit.value[r][p]
                  return (
                    <Slot
                      key={`${r}${p}`}
                      edit={edit}
                      slotKey={`${r}:${p}`}
                      label={`Child, ${regionLabel}, position ${p}${n ? `, ${n === 2 ? 'tall' : 'small'} peak` : ', empty'}`}
                      x={xOf(p) - 9}
                      y={base - 60}
                      width="18"
                      height="64"
                    />
                  )
                })
              )}
          </g>
        )
      })}
    </svg>
  )
}
