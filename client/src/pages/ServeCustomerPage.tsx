import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import matchaInterior from '../assets/order/matcha-interior.png'
import bearSmile from '../assets/order/bear-smile.png'
import bearOpen from '../assets/order/bear-open.png'
import bearLaugh from '../assets/order/bear-laugh.png'
import bearSad from '../assets/order/bear-sad.png'
import bearista from '../assets/order/bearista-cropped.png'
import drinkLarge from '../assets/order/drink-large.png'
import drinkSmall from '../assets/order/drink-small.png'
import orderCounter from '../assets/order/order-counter.png'
import { useDrinkProgress } from '../DrinkProgressContext'
import type { OrderScoreResult, ScoredDrinkOrderSubmission } from '../types/drinkSubmission'
import './StationPage.css'

const SERVE_TASTE_START_DELAY_MS = 1000
const SERVE_TASTE_MOVE_MS = 800
const SERVE_TASTE_PAUSE_MS = 1000
const SERVE_TASTE_ANIMATION_MS = 2600
const SERVE_SCORE_REVEAL_DELAY_MS = SERVE_TASTE_START_DELAY_MS + SERVE_TASTE_ANIMATION_MS
const SERVE_RETURN_TO_ORDER_DELAY_MS = 3000

const SCORE_ROWS: Array<{ label: string; key: keyof OrderScoreResult }> = [
  { label: 'Waiting', key: 'waitingScore' },
  { label: 'Accuracy', key: 'accuracyScore' },
  { label: 'Measurement', key: 'measurementScore' },
  { label: 'Topping', key: 'toppingScore' },
  { label: 'Total', key: 'totalScore' },
]

function findScoredSubmission(
  scoredSubmissions: ScoredDrinkOrderSubmission[],
  drinkId?: string,
) {
  if (!drinkId) {
    return null
  }

  for (let index = scoredSubmissions.length - 1; index >= 0; index -= 1) {
    const submission = scoredSubmissions[index]
    if (submission.drinkId === drinkId) {
      return submission
    }
  }

  return null
}

function ServeCustomerPage() {
  const navigate = useNavigate()
  const { lastOrderSubmission, scoredOrderSubmissions } = useDrinkProgress()
  const scoredSubmission = findScoredSubmission(scoredOrderSubmissions, lastOrderSubmission?.drinkId)
  const score = scoredSubmission?.score ?? null
  const servedDrinkSize = lastOrderSubmission?.drink.cupVisual.size ?? null
  const servedDrinkImage =
    servedDrinkSize === 'large' ? drinkLarge : servedDrinkSize === 'small' ? drinkSmall : null
  const [isBearTasting, setIsBearTasting] = useState(false)
  const [isScoreRevealed, setIsScoreRevealed] = useState(false)
  const bearReactionImage =
    score && isScoreRevealed ? (score.totalScore > 10 ? bearLaugh : bearSad) : bearSmile
  const bearImage = isBearTasting ? bearOpen : bearReactionImage

  useEffect(() => {
    if (!servedDrinkSize || !score) {
      return
    }

    const openMouthTimeoutId = window.setTimeout(
      () => setIsBearTasting(true),
      SERVE_TASTE_START_DELAY_MS + SERVE_TASTE_MOVE_MS,
    )
    const smileTimeoutId = window.setTimeout(
      () => setIsBearTasting(false),
      SERVE_TASTE_START_DELAY_MS + SERVE_TASTE_MOVE_MS + SERVE_TASTE_PAUSE_MS,
    )
    const revealScoreTimeoutId = window.setTimeout(
      () => setIsScoreRevealed(true),
      SERVE_SCORE_REVEAL_DELAY_MS,
    )
    const returnToOrderTimeoutId = window.setTimeout(
      () => navigate('/order-station'),
      SERVE_SCORE_REVEAL_DELAY_MS + SERVE_RETURN_TO_ORDER_DELAY_MS,
    )

    return () => {
      window.clearTimeout(openMouthTimeoutId)
      window.clearTimeout(smileTimeoutId)
      window.clearTimeout(revealScoreTimeoutId)
      window.clearTimeout(returnToOrderTimeoutId)
    }
  }, [lastOrderSubmission?.drinkId, navigate, score, servedDrinkSize])

  return (
    <main className="station-page serve-customer-page" aria-label="Serve customer page">
      <section className="station-stage">
        <img className="station-background" src={matchaInterior} alt="" draggable="false" />
        <img
          className="serve-customer-bear"
          src={bearImage}
          alt=""
          draggable="false"
        />
        {servedDrinkImage && (
          <img
            key={lastOrderSubmission?.drinkId}
            className={`serve-customer-drink serve-customer-drink--${servedDrinkSize} is-tasting`}
            src={servedDrinkImage}
            alt=""
            draggable="false"
          />
        )}
        <img className="serve-customer-counter" src={orderCounter} alt="" draggable="false" />
        <img className="serve-customer-bearista" src={bearista} alt="" draggable="false" />
        {score && (
          <section
            key={lastOrderSubmission?.drinkId}
            className="serve-customer-score-card"
            aria-label="Order score"
          >
            <p className="serve-customer-score-card__eyebrow">
              ORDER #{lastOrderSubmission?.orderNumber}
            </p>
            <h1 className="serve-customer-score-card__title">Score</h1>
            <dl className="serve-customer-score-card__list">
              {SCORE_ROWS.map((row) => (
                <div
                  key={row.key}
                  className={
                    row.key === 'totalScore'
                      ? 'serve-customer-score-card__row is-total'
                      : 'serve-customer-score-card__row'
                  }
                >
                  <dt>{row.label}</dt>
                  <dd>{score[row.key]}</dd>
                </div>
              ))}
              <div className="serve-customer-score-card__row">
                <dt>Tips</dt>
                <dd>${score.tipsEarned.toFixed(2)}</dd>
              </div>
            </dl>
          </section>
        )}
      </section>
    </main>
  )
}

export default ServeCustomerPage
