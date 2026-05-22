import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import backgroundStart from '../assets/start/background-start.png'
import logoGameName from '../assets/start/logo-game-name.png'
import logoLargeCup from '../assets/start/logo-large-cup.png'
import './AuthPage.css'

function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signUp, signInGoogle } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await signUp(email, password)
      navigate('/home')
    } catch {
      setError('Could not create an account with that email and password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSignup() {
    setError('')
    setIsSubmitting(true)

    try {
      await signInGoogle()
      navigate('/home')
    } catch {
      setError('Could not continue with Google.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page" aria-label="Sign up">
      <section className="auth-stage">
        <img className="auth-background" src={backgroundStart} alt="" draggable="false" />
        <img className="auth-cup" src={logoLargeCup} alt="" draggable="false" />
        <img className="auth-logo" src={logoGameName} alt="Mama's Matcharia" draggable="false" />
        <button className="auth-back-button" type="button" onClick={() => navigate('/')}>
          Back
        </button>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h1>Sign up</h1>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing up...' : 'Sign up'}
          </button>
          <button
            className="auth-secondary-button"
            type="button"
            onClick={handleGoogleSignup}
            disabled={isSubmitting}
          >
            Continue with Google
          </button>
          <Link className="auth-link" to="/login">
            Log in
          </Link>
        </form>
      </section>
    </main>
  )
}

export default SignupPage
