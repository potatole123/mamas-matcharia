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
import ServeCustomerPage from './pages/ServeCustomerPage'
import WaitingRoomPage from './pages/WaitingRoomPage'
import EnterJoinCodePage from './pages/EnterJoinCodePage'
import { Navigate, Routes, Route } from 'react-router-dom'
import { useAuth } from './auth'
import { GameDayProvider } from './GameDayProvider'
import { OrderTicketsProvider } from './OrderTicketsProvider'
import { TutorialProvider } from './TutorialProvider'
import { DrinkProgressProvider } from './DrinkProgressProvider'
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

function PublicOnlyRoute({ children }: ProtectedRouteProps) {
  const { loading, user } = useAuth()
  if (loading) {
    return null
  }

  return user ? <Navigate to="/home" replace /> : children
}

function App() {
  return (
    <GameDayProvider>
      <TutorialProvider>
        <OrderTicketsProvider>
          <DrinkProgressProvider>
            <div className="app-shell">
              <Routes>
                <Route
                  path="/"
                  element={
                    <PublicOnlyRoute>
                      <StartPage />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <PublicOnlyRoute>
                      <LoginPage />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/signup"
                  element={
                    <PublicOnlyRoute>
                      <SignupPage />
                    </PublicOnlyRoute>
                  }
                />
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
                  path="/serve-customer"
                  element={
                    <ProtectedRoute>
                      <ServeCustomerPage />
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
          </DrinkProgressProvider>
        </OrderTicketsProvider>
      </TutorialProvider>
    </GameDayProvider>
  )
}

export default App
