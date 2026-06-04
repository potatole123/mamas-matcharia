import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { submitDayScoreToBackend, type SubmitDayScoreResponse } from '../api/submitDayScore'
import { useDrinkProgress } from '../DrinkProgressContext'
import { useGameDayContext } from '../GameDayContext'
import { useOrderTicketsContext } from '../OrderTicketsContext'
import { aggregateOrderScores } from '../scoring/aggregateDayScore'
import type { OrderScoreResult } from '../types/drinkSubmission'
import { isFreePlayMode } from '../utils/gameMode'
import './GameSummary.css'

const TARGET_POINTS_PER_ORDER = 9

const SCORE_ROWS: Array<{ label: string; key: keyof OrderScoreResult }> = [
  { label: 'Waiting', key: 'waitingScore' },
  { label: 'Accuracy', key: 'accuracyScore' },
  { label: 'Measurement', key: 'measurementScore' },
  { label: 'Topping', key: 'toppingScore' },
  { label: 'Total', key: 'totalScore' },
]

function getStarCount(totalScore: number, targetScore: number) {
  if (targetScore <= 0) {
    return 1
  }
  if (totalScore >= targetScore * 1.2) {
    return 3
  }
  if (totalScore >= targetScore) {
    return 2
  }
  return 1
}

function GameSummary() {
  const navigate = useNavigate()
  const { getIdToken, updateProfile } = useAuth()
  const { dayState, resetDay } = useGameDayContext()
  const { resetTickets } = useOrderTicketsContext()
  const { orderScoresByOrderId, resetAllStationProgress } = useDrinkProgress()
  const scoreList = useMemo(() => Object.values(orderScoresByOrderId), [orderScoresByOrderId])
  const dayScore = useMemo(() => aggregateOrderScores(scoreList), [scoreList])
  const targetScore = (dayState?.day.npcCount ?? scoreList.length) * TARGET_POINTS_PER_ORDER
  const starCount = getStarCount(dayScore.totalScore, targetScore)
  const [submitResponse, setSubmitResponse] = useState<SubmitDayScoreResponse | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasSubmittedRef = useRef(false)

  useEffect(() => {
    if (isFreePlayMode(dayState?.day)) {
      navigate('/home', { replace: true })
    }
  }, [dayState?.day, navigate])

  const submitResults = useCallback(async () => {
    if (scoreList.length === 0) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error('Authentication token is unavailable')
      }
      const response = await submitDayScoreToBackend(dayScore, token)
      updateProfile(response.profile)
      setSubmitResponse(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not submit day score'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [dayScore, getIdToken, scoreList.length, updateProfile])

  useEffect(() => {
    if (hasSubmittedRef.current || scoreList.length === 0) {
      return
    }

    hasSubmittedRef.current = true
    void submitResults()
  }, [scoreList.length, submitResults])

  function handleRetrySubmit() {
    void submitResults()
  }

  function handleNextDay() {
    resetAllStationProgress()
    resetTickets()
    resetDay()
    navigate('/order-station')
  }

  if (scoreList.length === 0) {
    return (
      <main className="game-summary-page">
        <section className="game-summary-card">
          <p className="game-summary-kicker">No completed orders yet</p>
          <h1 className="game-summary-title">Day Results</h1>
          <button type="button" className="game-summary-button" onClick={() => navigate('/order-station')}>
            Back to Orders
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="game-summary-page">
      <section className="game-summary-card">
        <p className="game-summary-kicker">Level {dayState?.day.level ?? '-'}</p>
        <h1 className="game-summary-title">Day Results</h1>
        <div className="game-summary-stars" aria-label={`${starCount} star rating`}>
          {'★'.repeat(starCount)}
          <span>{'☆'.repeat(3 - starCount)}</span>
        </div>
        <p className="game-summary-target">
          Target: {targetScore} points | {scoreList.length} orders
        </p>

        <dl className="game-summary-score-list">
          {SCORE_ROWS.map((row) => (
            <div
              key={row.key}
              className={
                row.key === 'totalScore'
                  ? 'game-summary-score-row is-total'
                  : 'game-summary-score-row'
              }
            >
              <dt>{row.label}</dt>
              <dd>{dayScore[row.key]}</dd>
            </div>
          ))}
          <div className="game-summary-score-row">
            <dt>Tips</dt>
            <dd>${dayScore.tipsEarned.toFixed(2)}</dd>
          </div>
        </dl>

        <div className="game-summary-submit-status" aria-live="polite">
          {isSubmitting && 'Submitting results...'}
          {!isSubmitting && submitResponse && (
            submitResponse.passed ? 'Results submitted. Level cleared.' : 'Results submitted.'
          )}
          {!isSubmitting && submitError && `Submit failed: ${submitError}`}
        </div>

        <div className="game-summary-actions">
          {submitError && (
            <button
              type="button"
              className="game-summary-button game-summary-button--secondary"
              onClick={handleRetrySubmit}
              disabled={isSubmitting}
            >
              Retry Submit
            </button>
          )}
          <button
            type="button"
            className="game-summary-button"
            onClick={handleNextDay}
            disabled={isSubmitting || !submitResponse}
          >
            Next Day
          </button>
        </div>
      </section>
    </main>
  )
}

export default GameSummary
