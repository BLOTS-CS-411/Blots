import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'

import Home from './pages/Home'
import Learn from './pages/Learn'
import Exo from './pages/Exo'
import Exam from './pages/Exam'
import End from './pages/End'
import Pretest from './pages/Pretest'
import { enterPhase, watchSections } from './tracker'

import './App.css'

const PHASE_BY_ROUTE = {
  '/': 'home',
  '/pretest': 'pretest',
  '/learn': 'lesson',
  '/exo': 'exercises',
  '/exam': 'exam',
  '/end': 'end',
}

function PhaseTracker() {
  const { pathname } = useLocation()

  useEffect(() => {
    enterPhase(PHASE_BY_ROUTE[pathname] ?? pathname)
    return watchSections()
  }, [pathname])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <PhaseTracker />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pretest" element={<Pretest />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/exo" element={<Exo />} />
        <Route path="/exam" element={<Exam />} />
        <Route path="/end" element={<End />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
