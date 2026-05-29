import { useEffect, useState, type CSSProperties } from 'react'
import matchaInterior from '../assets/order/matcha-interior.png'
import bearista from '../assets/order/bearista-cropped.png'
import bearSmile from '../assets/order/bear-smile.png'
import bearLaugh from '../assets/order/bear-laugh.png'
import bearOpen from '../assets/order/bear-open.png'
import speechBubble from '../assets/order/speech-bubble.png'
import orderCounter from '../assets/order/order-counter.png'
import StationDock from '../components/StationDock'
import orderTicket from '../assets/station-shared/order-ticket.png'
import './StationPage.css'

type BearPhase = 'spawn' | 'moving' | 'at-counter' | 'talking' | 'exiting'

const TALKING_BEAR_EXPRESSIONS = [bearSmile, bearLaugh, bearOpen]

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

function OrderStationPage() {
  const [phase, setPhase] = useState<BearPhase>('spawn')
  const [bearExpressionIndex, setBearExpressionIndex] = useState(0)
  const [bearTransitionMs, setBearTransitionMs] = useState(0)

  useEffect(() => {
    let cancelled = false
    const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

    async function runSequenceLoop() {
      while (!cancelled) {
        setBearExpressionIndex(0)
        setBearTransitionMs(0)
        setPhase('spawn')
        await sleep(80)
        if (cancelled) return

        setBearTransitionMs(BEAR_MOVE_IN_MS)
        setPhase('moving')
        await sleep(BEAR_MOVE_IN_MS)
        if (cancelled) return

        setBearTransitionMs(0)
        setPhase('at-counter')
        await sleep(BEAR_PRE_TALK_DELAY_MS)
        if (cancelled) return

        setBearExpressionIndex(0)
        setPhase('talking')
        await sleep(BEAR_TALKING_DURATION_MS)
        if (cancelled) return

        setBearExpressionIndex(0)
        setBearTransitionMs(BEAR_EXIT_MS)
        setPhase('exiting')
        await sleep(BEAR_EXIT_MS + BEAR_RESET_DELAY_MS)
      }
    }

    void runSequenceLoop()
    return () => {
      cancelled = true
    }
  }, [])

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

  const isAtCounter = phase === 'moving' || phase === 'at-counter' || phase === 'talking'
  const isExiting = phase === 'exiting'

  const customerBearLeftPct = isExiting
    ? CUSTOMER_BEAR_EXIT_LEFT_PCT
    : isAtCounter
      ? CUSTOMER_BEAR_TARGET_LEFT_PCT
      : CUSTOMER_BEAR_START_LEFT_PCT
  const customerBearTopPct = isAtCounter || isExiting ? CUSTOMER_BEAR_TARGET_TOP_PCT : CUSTOMER_BEAR_START_TOP_PCT
  const customerBearWidthPct =
    isAtCounter || isExiting
      ? CUSTOMER_BEAR_TARGET_WIDTH_PCT
      : CUSTOMER_BEAR_TARGET_WIDTH_PCT * CUSTOMER_BEAR_START_SIZE_SCALE

  const customerBearStyle: CSSProperties = {
    left: `${customerBearLeftPct}%`,
    top: `${customerBearTopPct}%`,
    width: `${customerBearWidthPct}%`,
    ['--order-bear-transition-ms' as string]: `${bearTransitionMs}ms`,
  }

  return (
    <main className="station-page order-station-page" aria-label="Order station page">
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
        <img className="station-order-ticket" src={orderTicket} alt="" draggable="false" />
        <StationDock currentStation="order" />
      </section>
    </main>
  )
}

export default OrderStationPage
