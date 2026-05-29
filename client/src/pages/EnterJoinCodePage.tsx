import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import backgroundStart from '../assets/start/background-start.png'
import logoGameName from '../assets/start/logo-game-name.png'
import logoLargeCup from '../assets/start/logo-large-cup.png'
import './AuthPage.css'

const VALID_JOIN_CODE = '123456'

function EnterJoinCodePage() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (joinCode === VALID_JOIN_CODE) {
      navigate('/waiting-room')
      return
    }

    setError('Invalid join code. Please try again.')
  }

  return (
    <main className="auth-page" aria-label="Enter join code page">
      <section className="auth-stage">
        <img className="auth-background" src={backgroundStart} alt="" draggable="false" />
        <img className="auth-cup" src={logoLargeCup} alt="" draggable="false" />
        <img className="auth-logo" src={logoGameName} alt="Mama's Matcharia" draggable="false" />
        <button className="auth-back-button" type="button" onClick={() => navigate('/home')}>
          Back
        </button>
        <form className="auth-form" onSubmit={handleSubmit}>
          <h1>Join multiplayer</h1>
          <label>
            Join code
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={joinCode}
              onChange={(event) => {
                setJoinCode(event.target.value)
                setError('')
              }}
              autoComplete="off"
              required
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-primary-button" type="submit">
            Join
          </button>
        </form>
      </section>
    </main>
  )
}

export default EnterJoinCodePage
