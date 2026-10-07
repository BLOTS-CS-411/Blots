import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home'
import Learn from './pages/Learn'
import Exo from './pages/Exo'
import Exam from './pages/Exam'
import End from './pages/End'
import Pretest from './pages/Pretest'

import './App.css'

function App() {
  return (
    <BrowserRouter>
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