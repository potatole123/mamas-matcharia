import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createMultiplayerGame } from '../api/multiplayer'
import { useAuth } from '../auth'
import { useDrinkProgress } from '../DrinkProgressContext'
import { useGameDayContext } from '../GameDayContext'
import { useOrderTicketsContext } from '../OrderTicketsContext'
import { useTutorialContext } from '../TutorialContext'
import backgroundStart from '../assets/start/background-start.png'
import logoGameName from '../assets/start/logo-game-name.png'
import logoLargeCup from '../assets/start/logo-large-cup.png'
import createMultiplayerButton from '../assets/home/home-button-create-multiplayer.png'
import freePlayButton from '../assets/home/home-button-freeplay.png'
import joinMultiplayerButton from '../assets/home/home-button-join-multiplayer.png'
import logoutButton from '../assets/home/home-button-logout.png'
import startButton from '../assets/home/home-button-start.png'
import './HomePage.css'

type HomeButtonProps = {
  label: string
  src: string
  className: string
  onClick?: () => void
  disabled?: boolean
}

function HomeButton({ label, src, className, onClick, disabled }: HomeButtonProps) {
  return (
    <button
      className={`home-image-button ${className}`}
      onClick={onClick}
      aria-label={label}
      type="button"
      disabled={disabled}
    >
      <img src={src} alt="" draggable="false" />
    </button>
  )
}

function HomePage() {
  const navigate = useNavigate()
  const { getIdToken, logout } = useAuth()
  const { resetDay, startFreePlay } = useGameDayContext()
  const { resetTickets } = useOrderTicketsContext()
  const { resetAllStationProgress } = useDrinkProgress()
  const { resetTutorialProgress } = useTutorialContext()
  const [isCreatingMultiplayer, setIsCreatingMultiplayer] = useState(false)
  const [multiplayerError, setMultiplayerError] = useState('')

  function resetGameplayState() {
    resetDay()
    resetTickets()
    resetAllStationProgress()
    resetTutorialProgress()
  }

  function handleStartGame() {
    resetGameplayState()
    navigate('/order-station')
  }

  async function handleFreePlay() {
    resetGameplayState()
    await startFreePlay()
    navigate('/base-station')
  }

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  async function handleCreateMultiplayer() {
    setIsCreatingMultiplayer(true)
    setMultiplayerError('')

    try {
      const token = await getIdToken()

      if (!token) {
        throw new Error('Authentication token is unavailable')
      }

      const { game } = await createMultiplayerGame(token)
      navigate('/waiting-room', { state: { game } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create multiplayer game'
      setMultiplayerError(message)
    } finally {
      setIsCreatingMultiplayer(false)
    }
  }

  return (
    <main className="home-page" aria-label="Mama's Matcharia home page">
      <section className="home-stage">
        <img className="home-background" src={backgroundStart} alt="" draggable="false" />
        <img className="home-cup" src={logoLargeCup} alt="" draggable="false" />
        <img className="home-logo" src={logoGameName} alt="Mama's Matcharia" draggable="false" />
        <HomeButton
          className="home-logout-button"
          label="Log out"
          src={logoutButton}
          onClick={handleLogout}
        />
        <HomeButton
          className="home-start-button"
          label="Start"
          src={startButton}
          onClick={handleStartGame}
        />
        <HomeButton
          className="home-freeplay-button"
          label="Free play"
          src={freePlayButton}
          onClick={handleFreePlay}
        />
        <HomeButton
          className="home-create-multiplayer-button"
          label="Create multiplayer game"
          src={createMultiplayerButton}
          onClick={handleCreateMultiplayer}
          disabled={isCreatingMultiplayer}
        />
        <HomeButton
          className="home-join-multiplayer-button"
          label="Join multiplayer game"
          src={joinMultiplayerButton}
          onClick={() => navigate('/enter-join-code')}
        />
        {multiplayerError && <p className="home-error">{multiplayerError}</p>}
      </section>
    </main>
  )
}

export default HomePage
