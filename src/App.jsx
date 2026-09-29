import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home'
import Learn from './pages/Learn'
import Exo from './pages/Exo'

import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/exo" element={<Exo />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App