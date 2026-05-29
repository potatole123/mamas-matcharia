import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import matchaInterior from '../assets/order/matcha-interior.png'
import bearista from '../assets/order/bearista-cropped.png'
import bearSmile from '../assets/order/bear-smile.png'
import bearLaugh from '../assets/order/bear-laugh.png'
import bearOpen from '../assets/order/bear-open.png'
import speechBubble from '../assets/order/speech-bubble.png'
import orderCounter from '../assets/order/order-counter.png'
import OrderTicketBoard, { ORDER_TICKET_FIELDS } from '../components/OrderTicketBoard'
import StationDock from '../components/StationDock'
import { useOrderTicketsContext } from '../OrderTicketsContext'
import './StationPage.css'

type BearPhase = 'idle' | 'spawn' | 'moving' | 'at-counter' | 'talking' | 'exiting' | 'done'

const TALKING_BEAR_EXPRESSIONS = [bearSmile, bearLaugh, bearOpen]

// Customer bear layout controls (adjust these as needed)
const CUSTOMER_BEAR_TARGET_LEFT_PCT = 60
const CUSTOMER_BEAR_TARGET_TOP_PCT = 67
const CUSTOMER_BEAR_TARGET_WIDTH_PCT = 20
const CUSTOMER_BEAR_START_LEFT_PCT = 50
const CUSTOMER_BEAR_START_TOP_PCT = 55
const CUSTOMER_BEAR_START_SIZE_SCALE = 0.72
const CUSTOMER_BEAR_EXIT_LEFT_PCT = 120
const ORDER_TRIGGER_CENTER_X_PCT = CUSTOMER_BEAR_START_LEFT_PCT
const ORDER_TRIGGER_CENTER_Y_PCT = CUSTOMER_BEAR_START_TOP_PCT
const ORDER_TRIGGER_WIDTH_PCT = 24
const ORDER_TRIGGER_HEIGHT_PCT = 30

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
  const {
    ticketStore,
    showOrderTicketText,
    revealedOrderLineCount,
    beginNewOrder,
    showGeneratedOrder,
    revealNextLine,
    markOrderFullyRevealed,
    swapMainWithHistory,
  } = useOrderTicketsContext()
  const timeoutsRef = useRef<number[]>([])
  const stationStageRef = useRef<HTMLElement | null>(null)

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
    const nextTicket = beginNewOrder()

    setBearExpressionIndex(0)
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
      showGeneratedOrder(nextTicket)
      setPhase('talking')
    }, startTalkingDelayMs)

    schedule(() => {
      setBearExpressionIndex(0)
      markOrderFullyRevealed()
      setBearTransitionMs(BEAR_EXIT_MS)
      setPhase('exiting')
    }, startExitDelayMs)

    schedule(() => {
      setBearTransitionMs(0)
      setPhase('done')
    }, finishDelayMs)

    return clearPendingTimeouts
  }, [animationRunId, beginNewOrder, markOrderFullyRevealed, showGeneratedOrder])

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

    const revealTimerId = window.setInterval(revealNextLine, ORDER_TICKET_LINE_REVEAL_INTERVAL_MS)

    return () => window.clearInterval(revealTimerId)
  }, [phase, revealNextLine])

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
  const isInteractionLocked = phase !== 'idle' && phase !== 'done'

  const handleStageClick = (event: MouseEvent<HTMLElement>) => {
    if (isInteractionLocked) {
      return
    }

    const clickedElement = event.target as Element
    if (clickedElement.closest('.station-dock')) {
      return
    }

    const stageRect = stationStageRef.current?.getBoundingClientRect()
    if (!stageRect) {
      return
    }

    const clickXPct = ((event.clientX - stageRect.left) / stageRect.width) * 100
    const clickYPct = ((event.clientY - stageRect.top) / stageRect.height) * 100

    const leftBound = ORDER_TRIGGER_CENTER_X_PCT - ORDER_TRIGGER_WIDTH_PCT / 2
    const rightBound = ORDER_TRIGGER_CENTER_X_PCT + ORDER_TRIGGER_WIDTH_PCT / 2
    const topBound = ORDER_TRIGGER_CENTER_Y_PCT - ORDER_TRIGGER_HEIGHT_PCT / 2
    const bottomBound = ORDER_TRIGGER_CENTER_Y_PCT + ORDER_TRIGGER_HEIGHT_PCT / 2
    const isInsideTriggerZone =
      clickXPct >= leftBound &&
      clickXPct <= rightBound &&
      clickYPct >= topBound &&
      clickYPct <= bottomBound

    if (!isInsideTriggerZone) {
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
      <section className="station-stage" ref={stationStageRef}>
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
        <OrderTicketBoard
          ticketStore={ticketStore}
          showOrderTicketText={showOrderTicketText}
          revealedOrderLineCount={revealedOrderLineCount}
          onHistoryTicketClick={swapMainWithHistory}
          disabled={isInteractionLocked}
        />
        <StationDock currentStation="order" disabled={isInteractionLocked} />
      </section>
    </main>
  )
}

export default OrderStationPage
