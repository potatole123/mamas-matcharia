import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import matchaInterior from '../assets/order/matcha-interior.png'
import bearista from '../assets/order/bearista-cropped.png'
import bearSmile from '../assets/order/bear-smile.png'
import bearLaugh from '../assets/order/bear-laugh.png'
import bearOpen from '../assets/order/bear-open.png'
import speechBubble from '../assets/order/speech-bubble.png'
import orderCounter from '../assets/order/order-counter.png'
import StationDock from '../components/StationDock'
import orderTicket from '../assets/station-shared/order-ticket.png'
import {
  CREAM_TOP_TYPES,
  CUP_SIZES,
  FLAVOR_TYPES,
  ICE_LEVELS,
  MATCHA_TYPES,
  MILK_TYPES,
  POWDER_TYPES,
  SWEETENER_TYPES,
  SWEETNESS_LEVELS,
  TEMPS,
  type Recipe,
} from '../types/recipe'
import './StationPage.css'

type BearPhase = 'idle' | 'spawn' | 'moving' | 'at-counter' | 'talking' | 'exiting' | 'done'

const TALKING_BEAR_EXPRESSIONS = [bearSmile, bearLaugh, bearOpen]
const DISPLAYED_RECIPE_KEYS: Array<keyof Omit<Recipe, 'recipeId'>> = [
  'cupSize',
  'temp',
  'iceLevel',
  'matcha',
  'milk',
  'flavor',
  'sweetener',
  'sweetnessLevel',
  'creamTop',
  'powder',
]

function randomChoice<T>(values: readonly T[]): T {
  const randomIndex = Math.floor(Math.random() * values.length)
  return values[randomIndex]
}

function generateRandomRecipe(recipeIdSeed: number): Recipe {
  return {
    recipeId: `recipe-demo-${recipeIdSeed}`,
    cupSize: randomChoice(CUP_SIZES),
    temp: randomChoice(TEMPS),
    iceLevel: randomChoice(ICE_LEVELS),
    matcha: randomChoice(MATCHA_TYPES),
    milk: randomChoice(MILK_TYPES),
    flavor: randomChoice(FLAVOR_TYPES),
    sweetener: randomChoice(SWEETENER_TYPES),
    sweetnessLevel: randomChoice(SWEETNESS_LEVELS),
    creamTop: randomChoice(CREAM_TOP_TYPES),
    powder: randomChoice(POWDER_TYPES),
  }
}

function hasSameDisplayedValues(a: Recipe, b: Recipe): boolean {
  return DISPLAYED_RECIPE_KEYS.every((key) => a[key] === b[key])
}

function generateDifferentRecipe(previousRecipe: Recipe, recipeIdSeed: number): Recipe {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = generateRandomRecipe(recipeIdSeed + attempt)
    if (!hasSameDisplayedValues(candidate, previousRecipe)) {
      return candidate
    }
  }

  return generateRandomRecipe(recipeIdSeed + 99)
}

const ORDER_TICKET_FIELDS: Array<{ label: string; key: keyof Omit<Recipe, 'recipeId'> }> = [
  { label: 'Cup Size', key: 'cupSize' },
  { label: 'Temp', key: 'temp' },
  { label: 'Ice', key: 'iceLevel' },
  { label: 'Matcha', key: 'matcha' },
  { label: 'Milk', key: 'milk' },
  { label: 'Flavor', key: 'flavor' },
  { label: 'Sweetener', key: 'sweetener' },
  { label: 'Sweetness', key: 'sweetnessLevel' },
  { label: 'Cream Top', key: 'creamTop' },
  { label: 'Powder', key: 'powder' },
]

// Customer bear layout controls (adjust these as needed)
const CUSTOMER_BEAR_TARGET_LEFT_PCT = 60
const CUSTOMER_BEAR_TARGET_TOP_PCT = 67
const CUSTOMER_BEAR_TARGET_WIDTH_PCT = 20
const CUSTOMER_BEAR_START_LEFT_PCT = 50
const CUSTOMER_BEAR_START_TOP_PCT = 55
const CUSTOMER_BEAR_START_SIZE_SCALE = 0.72
const CUSTOMER_BEAR_EXIT_LEFT_PCT = 120

// Sequence timing controls (milliseconds)
const BEAR_MOVE_IN_MS = 1500
const BEAR_PRE_TALK_DELAY_MS = 700
const BEAR_TALKING_DURATION_MS = 3200
const BEAR_EXIT_MS = 1100
const BEAR_RESET_DELAY_MS = 250
const BEAR_CYCLE_MS = 200
const ORDER_TICKET_LINE_REVEAL_INTERVAL_MS = Math.max(
  120,
  Math.floor(BEAR_TALKING_DURATION_MS / ORDER_TICKET_FIELDS.length),
)

function OrderStationPage() {
  const [phase, setPhase] = useState<BearPhase>('idle')
  const [bearExpressionIndex, setBearExpressionIndex] = useState(0)
  const [bearTransitionMs, setBearTransitionMs] = useState(0)
  const [animationRunId, setAnimationRunId] = useState(0)
  const [showOrderTicketText, setShowOrderTicketText] = useState(false)
  const [revealedOrderLineCount, setRevealedOrderLineCount] = useState(0)
  const [currentRecipe, setCurrentRecipe] = useState<Recipe>(() => generateRandomRecipe(1))
  const timeoutsRef = useRef<number[]>([])

  const clearPendingTimeouts = () => {
    for (const timeoutId of timeoutsRef.current) {
      window.clearTimeout(timeoutId)
    }
    timeoutsRef.current = []
  }

  useEffect(() => {
    if (animationRunId === 0) {
      return
    }

    clearPendingTimeouts()
    setCurrentRecipe((previousRecipe) => generateDifferentRecipe(previousRecipe, animationRunId))
    setBearExpressionIndex(0)
    setShowOrderTicketText(false)
    setRevealedOrderLineCount(0)
    setBearTransitionMs(0)
    setPhase('spawn')

    const schedule = (callback: () => void, delayMs: number) => {
      const timeoutId = window.setTimeout(callback, delayMs)
      timeoutsRef.current.push(timeoutId)
    }

    const startMoveDelayMs = 80
    const startTalkingDelayMs = startMoveDelayMs + BEAR_MOVE_IN_MS + BEAR_PRE_TALK_DELAY_MS
    const startExitDelayMs = startTalkingDelayMs + BEAR_TALKING_DURATION_MS
    const finishDelayMs = startExitDelayMs + BEAR_EXIT_MS + BEAR_RESET_DELAY_MS

    schedule(() => {
      setBearTransitionMs(BEAR_MOVE_IN_MS)
      setPhase('moving')
    }, startMoveDelayMs)

    schedule(() => {
      setBearTransitionMs(0)
      setPhase('at-counter')
    }, startMoveDelayMs + BEAR_MOVE_IN_MS)

    schedule(() => {
      setBearExpressionIndex(0)
      setShowOrderTicketText(true)
      setRevealedOrderLineCount(0)
      setPhase('talking')
    }, startTalkingDelayMs)

    schedule(() => {
      setBearExpressionIndex(0)
      setRevealedOrderLineCount(ORDER_TICKET_FIELDS.length)
      setBearTransitionMs(BEAR_EXIT_MS)
      setPhase('exiting')
    }, startExitDelayMs)

    schedule(() => {
      setBearTransitionMs(0)
      setPhase('done')
    }, finishDelayMs)

    return clearPendingTimeouts
  }, [animationRunId])

  useEffect(() => {
    if (phase !== 'talking') {
      return
    }

    const timerId = window.setInterval(() => {
      setBearExpressionIndex(
        (currentIndex) => (currentIndex + 1) % TALKING_BEAR_EXPRESSIONS.length,
      )
    }, BEAR_CYCLE_MS)

    return () => window.clearInterval(timerId)
  }, [phase])

  useEffect(() => {
    if (phase !== 'talking') {
      return
    }

    const revealTimerId = window.setInterval(() => {
      setRevealedOrderLineCount((currentCount) =>
        Math.min(currentCount + 1, ORDER_TICKET_FIELDS.length),
      )
    }, ORDER_TICKET_LINE_REVEAL_INTERVAL_MS)

    return () => window.clearInterval(revealTimerId)
  }, [phase])

  const isAtCounter = phase === 'moving' || phase === 'at-counter' || phase === 'talking'
  const isExiting = phase === 'exiting'
  const isDone = phase === 'done'

  const customerBearLeftPct = isDone || isExiting
    ? CUSTOMER_BEAR_EXIT_LEFT_PCT
    : isAtCounter
      ? CUSTOMER_BEAR_TARGET_LEFT_PCT
      : CUSTOMER_BEAR_START_LEFT_PCT
  const customerBearTopPct =
    isAtCounter || isExiting || isDone ? CUSTOMER_BEAR_TARGET_TOP_PCT : CUSTOMER_BEAR_START_TOP_PCT
  const customerBearWidthPct =
    isAtCounter || isExiting || isDone
      ? CUSTOMER_BEAR_TARGET_WIDTH_PCT
      : CUSTOMER_BEAR_TARGET_WIDTH_PCT * CUSTOMER_BEAR_START_SIZE_SCALE

  const customerBearStyle: CSSProperties = {
    left: `${customerBearLeftPct}%`,
    top: `${customerBearTopPct}%`,
    width: `${customerBearWidthPct}%`,
    ['--order-bear-transition-ms' as string]: `${bearTransitionMs}ms`,
  }

  const handleStageClick = (event: MouseEvent<HTMLElement>) => {
    const clickedElement = event.target as Element
    if (clickedElement.closest('.station-dock')) {
      return
    }

    setAnimationRunId((previous) => previous + 1)
  }

  return (
    <main
      className="station-page order-station-page"
      aria-label="Order station page"
      onClick={handleStageClick}
    >
      <section className="station-stage">
        <img className="station-background" src={matchaInterior} alt="" draggable="false" />
        <img
          className="order-bear-customer"
          src={TALKING_BEAR_EXPRESSIONS[bearExpressionIndex]}
          alt=""
          draggable="false"
          style={customerBearStyle}
        />
        <img className="order-counter" src={orderCounter} alt="" draggable="false" />
        <img className="order-bearista" src={bearista} alt="" draggable="false" />
        {phase === 'talking' && (
          <img className="order-speech-bubble" src={speechBubble} alt="" draggable="false" />
        )}
        <div className="station-order-ticket-wrap">
          <img className="station-order-ticket" src={orderTicket} alt="" draggable="false" />
          {showOrderTicketText && (
            <div className="station-order-ticket-text" aria-label="Customer order details">
              <p className="station-order-ticket-title">ORDER</p>
              <ul className="station-order-ticket-list">
                {ORDER_TICKET_FIELDS.slice(0, revealedOrderLineCount).map((field) => (
                  <li key={field.key}>
                    <span>{field.label}</span>
                    <span>{currentRecipe[field.key]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <StationDock currentStation="order" />
      </section>
    </main>
  )
}

export default OrderStationPage
