import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import GameSummary from './pages/GameSummary'
import StartPage from './pages/StartPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import OrderStationPage from './pages/OrderStationPage'
import BaseStationPage from './pages/BaseStationPage'
import WhiskingStationPage from './pages/WhiskingStationPage'
import ToppingStationPage from './pages/ToppingStationPage'
import WaitingRoomPage from './pages/WaitingRoomPage'
import EnterJoinCodePage from './pages/EnterJoinCodePage'
import { Navigate, Routes, Route } from 'react-router-dom'
import { useAuth } from './auth'
import { OrderTicketsProvider } from './OrderTicketsContext'
import './App.css'

type ProtectedRouteProps = {
  children: React.ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { loading, user } = useAuth()
  if (loading) {
    return null
  }

  return user ? children : <Navigate to="/" replace />
}

function App() {
  return (
    <OrderTicketsProvider>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game"
            element={
              <ProtectedRoute>
                <GamePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game-summary"
            element={
              <ProtectedRoute>
                <GameSummary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-station"
            element={
              <ProtectedRoute>
                <OrderStationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/base-station"
            element={
              <ProtectedRoute>
                <BaseStationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/whisking-station"
            element={
              <ProtectedRoute>
                <WhiskingStationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/topping-station"
            element={
              <ProtectedRoute>
                <ToppingStationPage />
              </ProtectedRoute>
            }
          />
        <Route
          path="/waiting-room"
          element={
            <ProtectedRoute>
              <WaitingRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enter-join-code"
          element={
            <ProtectedRoute>
              <EnterJoinCodePage />
            </ProtectedRoute>
          }
        />
        </Routes>
      </div>
    </OrderTicketsProvider>
  )
}

export default App
