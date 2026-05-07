import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import GameSummary from './pages/GameSummary'
import { Routes, Route, Link } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <>
      <nav style={{ display: 'flex', gap: '10px'}}>
        <Link to="/"><button>Home</button></Link>
        <Link to="/game"><button>Game</button></Link>
        <Link to="/game-summary"><button>Game Summary</button></Link>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/game-summary" element={<GameSummary />} />
      </Routes>
    </>
  )
}

export default App
