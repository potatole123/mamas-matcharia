import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import GameSummary from './pages/GameSummary'
import StartPage from './pages/StartPage'
import { Routes, Route } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/game-summary" element={<GameSummary />} />
      </Routes>
    </div>
  )
}

export default App
