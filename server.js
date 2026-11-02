// server.js (local testing only)
import express from 'express'
import handler from './api/chat.js'

const app = express()
app.use(express.json())
app.post('/api/chat', handler)
app.listen(3001, (err) => {
  if (err) {
    console.error('Cannot start:', err.message)
    process.exit(1)
  }
  console.log('API on http://localhost:3001')
})