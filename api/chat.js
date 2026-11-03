// api/chat.js (Groq, free tier)
const MODEL = 'openai/gpt-oss-120b'
const URL = 'https://api.groq.com/openai/v1/chat/completions'
console.log('chat.js v2 loaded')

const RUBRIC = `Hint strength scale (0-100):
0   No hint: neutral request to explain or elaborate.
20  Generic nudge to re-check, with no pointer ("look at the figures again, does anything not match?").
40  Points to a technique or figure (Southern blot or microsatellites) without saying what to look at.
60  Points to a specific feature (methylation band, critical-region peaks, band intensity) without saying what it should show.
80  Says exactly what to compare and the possible outcomes, so the answer is almost forced.
100 States the interpretation, or the exact inference that gives it away.`

const SYSTEM = `You are a tutor inside a short lesson on Angelman syndrome.
The student has just checked their answers on a diagnosis exercise and was asked
to explain their reasoning for one case.

Facts of this lesson (use only these when talking about the techniques):
- Southern blot: Xba I always cuts, giving a 4.2 kb fragment. Not I cuts only if its
  site is unmethylated, giving a 0.9 kb fragment. In a healthy person, the double
  digest shows both bands: the maternal allele is methylated (stays at 4.2 kb) and
  the paternal allele is unmethylated (drops to 0.9 kb).
- Microsatellites: each peak is an allele. The child's peaks are compared with each
  parent's, inside and outside the critical region. A single tall peak means homozygous.
- Point mutation of UBE3A: normal blot (both bands), both parents contribute.
- Paternal uniparental disomy: no methylation (only 0.9 kb), all child alleles are paternal.
- Maternal deletion: no methylation, bands about half as intense, no maternal allele
  in the critical region only.
- Imprinting error: no methylation, both parents contribute.
- Normal: same pattern as the parents, no symptoms.

${RUBRIC}

Escalation rules:
- Your first reply must sit around level 20.
- Go up one step (20, 40, 60, 80) only if the student is still stuck, says they
  don't know, or repeats a wrong idea. If they make progress, stay at the same level.
- Never go above level 80.
- Never say whether the student's answer is right or wrong, and never name the
  correct interpretation of the case.
- If the student says something false about how the techniques work, correct it
  gently using the facts above, without revealing the case's answer.
- Plain text only: no bold, no lists, no markdown. Maximum 60 words.`

const JUDGE = `You rate how strong a hint a tutor's reply gives to a student.
${RUBRIC}
Rate only what the tutor reply reveals. Do not judge whether it is polite or correct.
You may use any integer between the anchor levels.
Answer with JSON only, no other text: {"score": <integer 0-100>, "reason": "<one short sentence>"}`

async function callGroq(body) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, reasoning_effort: 'low', ...body }),
  })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  const data = await r.json()
  return data.choices?.[0]?.message?.content ?? ''
}

async function rateHint({ reply, studentMessage, correct }) {
  const text = await callGroq({
    temperature: 0,
    max_tokens: 800,
    messages: [
      { role: 'system', content: JUDGE },
      {
        role: 'user',
        content:
          `Correct interpretation (hidden from the student): ${correct ?? 'unknown'}\n` +
          `Student's last message: ${studentMessage}\n` +
          `Tutor reply to rate: ${reply}`,
      },
    ],
  })
  const json = JSON.parse(text.match(/\{[\s\S]*\}/)[0])
  const score = Math.max(0, Math.min(100, Math.round(Number(json.score))))
  if (Number.isNaN(score)) throw new Error('Judge returned no score')
  return { score, reason: String(json.reason ?? '').slice(0, 300) }
}

export default async function handler(req, res) {
  console.log('chat request received')
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { messages = [], context = {} } = req.body ?? {}

  const clean = messages
    .slice(-20)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content).slice(0, 2000),
    }))
  if (clean.length === 0) return res.status(400).json({ error: 'No messages' })

  const note = context.case
    ? `\n\nCurrent case: ${context.case}. The student chose: "${context.selected ?? 'nothing'}".`
    : ''

  try {
    // 1. The tutor answers (it does not know the correct interpretation)
    const reply =
      (await callGroq({
        max_tokens: 1500,
        messages: [{ role: 'system', content: SYSTEM + note }, ...clean],
      })) || 'Sorry, I have no answer for that.'

    // 2. A separate call rates the strength of the hint (if it fails, the chat still works)
    let hint = null
    try {
      const lastUser = [...clean].reverse().find((m) => m.role === 'user')
      hint = await rateHint({
        reply,
        studentMessage: lastUser?.content ?? '',
        correct: context.correct,
      })
    } catch (err) {
      console.error('hint rating failed', err)
    }

    res.status(200).json({ reply, hint })
  } catch (err) {
    console.error(err)
    const error = String(err.message).startsWith('429')
      ? 'Too many requests, please wait a few seconds.'
      : 'The assistant is unavailable right now.'
    res.status(500).json({ error })
  }
}