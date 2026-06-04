import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { joinMultiplayerGame } from '../api/multiplayer'
import { useAuth } from '../auth'
import backgroundStart from '../assets/start/background-start.png'
import logoGameName from '../assets/start/logo-game-name.png'
import logoLargeCup from '../assets/start/logo-large-cup.png'
import './AuthPage.css'

const JOIN_CODE_PATTERN = /^\d{6}$/

function EnterJoinCodePage() {
  const navigate = useNavigate()
  const { getIdToken } = useAuth()
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const normalizedJoinCode = joinCode.trim()

    if (!JOIN_CODE_PATTERN.test(normalizedJoinCode)) {
      setError('Join code must be exactly 6 digits.')
      return
    }

    setIsJoining(true)

    try {
      const token = await getIdToken()

      if (!token) {
        throw new Error('Authentication token is unavailable')
      }

      const { game } = await joinMultiplayerGame(normalizedJoinCode, token)
      navigate('/waiting-room', { state: { game } })
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Could not join game'
      setError(message)
    } finally {
      setIsJoining(false)
    }
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
                setJoinCode(event.target.value.replace(/\D/g, ''))
                setError('')
              }}
              autoComplete="off"
              required
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-primary-button" type="submit" disabled={isJoining}>
            {isJoining ? 'Joining...' : 'Join'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default EnterJoinCodePage
