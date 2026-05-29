import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
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
}

function HomeButton({ label, src, className, onClick }: HomeButtonProps) {
  return (
    <button
      className={`home-image-button ${className}`}
      onClick={onClick}
      aria-label={label}
      type="button"
    >
      <img src={src} alt="" draggable="false" />
    </button>
  )
}

const noop = () => undefined

function HomePage() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  async function handleLogout() {
    await logout()
    navigate('/')
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
          onClick={() => navigate('/order-station')}
        />
        <HomeButton
          className="home-freeplay-button"
          label="Free play"
          src={freePlayButton}
          onClick={noop}
        />
        <HomeButton
          className="home-create-multiplayer-button"
          label="Create multiplayer game"
          src={createMultiplayerButton}
          onClick={noop}
        />
        <HomeButton
          className="home-join-multiplayer-button"
          label="Join multiplayer game"
          src={joinMultiplayerButton}
          onClick={() => navigate('/enter-join-code')}
        />
      </section>
    </main>
  )
}

export default HomePage
