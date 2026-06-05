import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import {
  getCurrentMultiplayerResults,
  leaveMultiplayerGame,
  type MultiplayerResults,
} from '../api/multiplayer'
import { submitDayScoreToBackend, type SubmitDayScoreResponse } from '../api/submitDayScore'
import { useDrinkProgress } from '../DrinkProgressContext'
import { useGameDayContext } from '../GameDayContext'
import { useOrderTicketsContext } from '../OrderTicketsContext'
import { aggregateOrderScores } from '../scoring/aggregateDayScore'
import type { OrderScoreResult } from '../types/drinkSubmission'
import { isFreePlayMode } from '../utils/gameMode'
import './GameSummary.css'

const TARGET_POINTS_PER_ORDER = 9
const MULTIPLAYER_RESULTS_REFRESH_MS = 2000

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
  const { getIdToken, updateProfile, user } = useAuth()
  const { dayState, resetDay } = useGameDayContext()
  const { resetTickets } = useOrderTicketsContext()
  const { orderScoresByOrderId, resetAllStationProgress } = useDrinkProgress()
  const scoreList = useMemo(() => Object.values(orderScoresByOrderId), [orderScoresByOrderId])
  const dayScore = useMemo(() => aggregateOrderScores(scoreList), [scoreList])
  const targetScore = (dayState?.day.npcCount ?? scoreList.length) * TARGET_POINTS_PER_ORDER
  const isMultiplayer = dayState?.day.mode === 'multiplayer'
  const starCount = getStarCount(dayScore.totalScore, targetScore)
  const [submitResponse, setSubmitResponse] = useState<SubmitDayScoreResponse | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLeavingMultiplayer, setIsLeavingMultiplayer] = useState(false)
  const [multiplayerResults, setMultiplayerResults] = useState<MultiplayerResults | null>(null)
  const [multiplayerResultsError, setMultiplayerResultsError] = useState<string | null>(null)
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

  useEffect(() => {
    if (!isMultiplayer || !submitResponse) {
      return
    }

    let isSubscribed = true
    let intervalId: number | null = null

    async function loadResults() {
      try {
        const token = await getIdToken()
        if (!token) {
          throw new Error('Authentication token is unavailable')
        }

        const response = await getCurrentMultiplayerResults(token)
        if (isSubscribed) {
          setMultiplayerResults(response.results)
          setMultiplayerResultsError(null)
        }
      } catch (error) {
        if (isSubscribed) {
          const message =
            error instanceof Error ? error.message : 'Could not load multiplayer results'
          setMultiplayerResultsError(message)
        }
      }
    }

    void loadResults()
    intervalId = window.setInterval(loadResults, MULTIPLAYER_RESULTS_REFRESH_MS)

    return () => {
      isSubscribed = false
      if (intervalId !== null) {
        window.clearInterval(intervalId)
      }
    }
  }, [getIdToken, isMultiplayer, submitResponse])

  function handleRetrySubmit() {
    void submitResults()
  }

  function handleNextDay() {
    resetAllStationProgress()
    resetTickets()
    resetDay()
    navigate('/order-station')
  }

  async function handleBackHome() {
    if (isLeavingMultiplayer) {
      return
    }

    setIsLeavingMultiplayer(true)
    setMultiplayerResultsError(null)

    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error('Authentication token is unavailable')
      }

      await leaveMultiplayerGame(token)
      resetAllStationProgress()
      resetTickets()
      resetDay()
      navigate('/home')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not leave multiplayer game'
      setMultiplayerResultsError(message)
      setIsLeavingMultiplayer(false)
    }
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

  const summaryKicker = isMultiplayer ? 'Multiplayer' : `Level ${dayState?.day.level ?? '-'}`
  const summaryTitle = isMultiplayer ? 'Room Results' : 'Day Results'

  return (
    <main className="game-summary-page">
      <section className="game-summary-card">
        <p className="game-summary-kicker">{summaryKicker}</p>
        <h1 className="game-summary-title">{summaryTitle}</h1>
        {!isMultiplayer && <div className="game-summary-stars" aria-label={`${starCount} star rating`}>
          {'★'.repeat(starCount)}
          <span>{'☆'.repeat(3 - starCount)}</span>
        </div>}
        {!isMultiplayer && <p className="game-summary-target">
          Target: {targetScore} points | {scoreList.length} orders
        </p>}

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
          {!isSubmitting &&
            submitResponse &&
            (isMultiplayer
              ? 'Your score is in.'
              : submitResponse.passed
                ? 'Results submitted. Level cleared.'
                : 'Results submitted.')}
          {!isSubmitting && submitError && `Submit failed: ${submitError}`}
        </div>

        {isMultiplayer && (
          <section className="game-summary-multiplayer" aria-label="Multiplayer results">
            <h2>Room Rankings</h2>
            {multiplayerResults ? (
              <>
                <p className="game-summary-target">
                  {multiplayerResults.submittedCount} / {multiplayerResults.playerCount} players finished
                </p>
                <ol className="game-summary-ranking-list">
                  {multiplayerResults.players.map((player) => (
                    <li
                      className={`game-summary-ranking-row${
                        player.playerId === user?.uid ? ' is-current-player' : ''
                      }`}
                      key={player.playerId}
                    >
                      <span className="game-summary-rank">
                        {player.rank === null ? '-' : `#${player.rank}`}
                      </span>
                      <span className="game-summary-player-name">{player.displayName}</span>
                      <span className="game-summary-player-score">
                        {player.result ? player.result.totalScore : 'Waiting'}
                      </span>
                    </li>
                  ))}
                </ol>
                {multiplayerResults.allSubmitted && multiplayerResults.players.some((player) => player.isWinner) && (
                  <p className="game-summary-winner">
                    Winner:{' '}
                    {multiplayerResults.players
                      .filter((player) => player.isWinner)
                      .map((player) => player.displayName)
                      .join(', ')}
                  </p>
                )}
              </>
            ) : (
              <p className="game-summary-target">Loading room results...</p>
            )}
            {multiplayerResultsError && (
              <p className="game-summary-submit-status">
                Results unavailable: {multiplayerResultsError}
              </p>
            )}
          </section>
        )}

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
          {isMultiplayer ? (
            <button
              type="button"
              className="game-summary-button"
              onClick={handleBackHome}
              disabled={isSubmitting || isLeavingMultiplayer || !submitResponse}
            >
              {isLeavingMultiplayer ? 'Leaving...' : 'Back Home'}
            </button>
          ) : (
            <button
              type="button"
              className="game-summary-button"
              onClick={handleNextDay}
              disabled={isSubmitting || !submitResponse}
            >
              Next Day
            </button>
          )}
        </div>
      </section>
    </main>
  )
}

export default GameSummary
