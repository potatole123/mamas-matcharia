import { useNavigate } from 'react-router-dom'
import backgroundStart from '../assets/start/background-start.png'
import logoGameName from '../assets/start/logo-game-name.png'
import logoLargeCup from '../assets/start/logo-large-cup.png'
import loginButton from '../assets/start/start-button-login.png'
import signupButton from '../assets/start/start-button-signup.png'
import './StartPage.css'

type ImageButtonProps = {
  label: string
  src: string
  className: string
  onClick: () => void
}

function ImageButton({ label, src, className, onClick }: ImageButtonProps) {
  return (
    <button className={`start-image-button ${className}`} onClick={onClick} aria-label={label}>
      <img src={src} alt="" draggable="false" />
    </button>
  )
}

function StartPage() {
  const navigate = useNavigate()
  const goToHome = () => navigate('/home')

  return (
    <main className="start-page" aria-label="Mama's Matcharia start page">
      <section className="start-stage">
        <img className="start-background" src={backgroundStart} alt="" draggable="false" />
        <img className="start-cup" src={logoLargeCup} alt="" draggable="false" />
        <img className="start-logo" src={logoGameName} alt="Mama's Matcharia" draggable="false" />
        <ImageButton
          className="start-login-button"
          label="Log in"
          src={loginButton}
          onClick={goToHome}
        />
        <ImageButton
          className="start-signup-button"
          label="Sign up"
          src={signupButton}
          onClick={goToHome}
        />
      </section>
    </main>
  )
}

export default StartPage
