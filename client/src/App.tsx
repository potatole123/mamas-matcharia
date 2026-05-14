import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import GameSummary from './pages/GameSummary'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import { Routes, Route, Link } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <>
      <nav style={{ display: 'flex', gap: '10px'}}>
        <Link to="/home"><button>Home</button></Link>
        <Link to="/game"><button>Game</button></Link>
        <Link to="/game-summary"><button>Game Summary</button></Link>
      </nav>

      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/game-summary" element={<GameSummary />} />
      </Routes>
    </>
  )
}

export default App
