// api/chat.js (Groq, free tier)
const MODEL = 'openai/gpt-oss-120b'
const URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM = `You are a tutor inside a short lesson on Angelman syndrome
(UBE3A, imprinting, Southern blot, microsatellites).
The student has just checked their answers on a diagnosis exercise and was asked
to explain their reasoning for one case.
- Keep replies under 80 words, in plain language.
- React to their reasoning, then ask one follow-up question or give one hint.
- Never state which interpretation is correct for the case.`

export default async function handler(req, res) {
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
    const r = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        reasoning_effort: 'low',
        messages: [{ role: 'system', content: SYSTEM + note }, ...clean],
      }),
    })
    if (!r.ok) {
      console.error(r.status, await r.text())
      const error =
        r.status === 429
          ? 'Too many requests, please wait a few seconds.'
          : 'The assistant is unavailable right now.'
      return res.status(500).json({ error })
    }
    const data = await r.json()
    const reply = data.choices?.[0]?.message?.content ?? ''
    res.status(200).json({ reply: reply || 'Sorry, I have no answer for that.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'The assistant is unavailable right now.' })
  }
}