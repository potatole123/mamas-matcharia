import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import matchaInterior from '../assets/order/matcha-interior.png'
import bearista from '../assets/order/bearista-cropped.png'
import bearSmile from '../assets/order/bear-smile.png'
import bearLaugh from '../assets/order/bear-laugh.png'
import bearOpen from '../assets/order/bear-open.png'
import speechBubble from '../assets/order/speech-bubble.png'
import orderCounter from '../assets/order/order-counter.png'
import OrderTicketBoard from '../components/OrderTicketBoard'
import StationDock from '../components/StationDock'
import { useGameDayContext } from '../GameDayContext'
import { useOrderTicketsContext } from '../OrderTicketsContext'
import { useTutorialContext, type OrderStationTutorialStep } from '../TutorialContext'
import { ORDER_TICKET_FIELDS, type TicketData } from '../hooks/useOrderTickets'
import type { ScheduledNpc } from '../types/game'
import { isFreePlayMode, isTutorialGameplayMode } from '../utils/gameMode'
import './StationPage.css'

type BearPhase = 'idle' | 'spawn' | 'moving' | 'at-counter' | 'talking' | 'exiting'

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
const LEVEL_BANNER_DURATION_MS = 3000
const ORDER_TICKET_LINE_REVEAL_INTERVAL_MS = Math.max(
  120,
  Math.floor(BEAR_TALKING_DURATION_MS / ORDER_TICKET_FIELDS.length),
)

const ORDER_STATION_TUTORIAL_MESSAGES: Record<
  Exclude<OrderStationTutorialStep, 'complete'>,
  string
> = {
  welcome:
    'Welcome to Mama\'s Matcharia! Since our store went viral on MikMok the other day, lots of Bruins are readily lining up at our store eager to try our matcha.',
  'take-order': 'When a Bruin finally makes it to the door, click on them to take their order.',
  'customer-talking': 'Wow, this Bruin really likes to yap.',
  'order-ticket':
    'Our first customer\'s order is written on this order ticket. When you have multiple active orders, you can toggle between them by clicking on the desired order ticket in the top bar. Now feel free to take more orders, or get to making your first drink!',
}

function toTicketData(npc: ScheduledNpc): TicketData {
  return {
    orderId: npc.order.orderId,
    orderNumber: npc.orderNumber,
    recipe: npc.order.recipe,
  }
}

function OrderStationPage() {
  const [phase, setPhase] = useState<BearPhase>('idle')
  const [bearExpressionIndex, setBearExpressionIndex] = useState(0)
  const [bearTransitionMs, setBearTransitionMs] = useState(0)
  const [activeNpc, setActiveNpc] = useState<ScheduledNpc | null>(null)
  const [isLevelBannerVisible, setIsLevelBannerVisible] = useState(false)
  const [isFreePlayIntroVisible, setIsFreePlayIntroVisible] = useState(false)
  const { orderStationStep, setOrderStationStep } = useTutorialContext()
  const {
    dayState,
    waitingNpcs,
    dayStartError,
    startDay,
    consumeLevelBanner,
    claimWaitingNpc,
  } = useGameDayContext()
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
  const tutorialStepRef = useRef(orderStationStep)

  const clearPendingTimeouts = useCallback(() => {
    for (const timeoutId of timeoutsRef.current) {
      window.clearTimeout(timeoutId)
    }
    timeoutsRef.current = []
  }, [])

  const isFreePlay = isFreePlayMode(dayState?.day)

  useEffect(() => {
    if (isFreePlay) {
      return
    }

    void startDay().catch((error: unknown) => {
      console.error('Could not start game day', error)
    })
  }, [isFreePlay, startDay])

  useEffect(() => {
    tutorialStepRef.current = isTutorialGameplayMode(dayState?.day) ? orderStationStep : null
  }, [dayState?.day.mode, orderStationStep])

  useEffect(() => {
    if (!dayState || !consumeLevelBanner()) {
      return
    }

    setIsLevelBannerVisible(true)
    const hideBannerTimeoutId = window.setTimeout(
      () => setIsLevelBannerVisible(false),
      LEVEL_BANNER_DURATION_MS,
    )

    return () => {
      window.clearTimeout(hideBannerTimeoutId)
    }
  }, [consumeLevelBanner, dayState])

  useEffect(() => {
    if (!isFreePlay) {
      return
    }

    const showIntroTimeoutId = window.setTimeout(() => setIsFreePlayIntroVisible(true), 0)
    const hideIntroTimeoutId = window.setTimeout(
      () => setIsFreePlayIntroVisible(false),
      LEVEL_BANNER_DURATION_MS,
    )

    return () => {
      window.clearTimeout(showIntroTimeoutId)
      window.clearTimeout(hideIntroTimeoutId)
    }
  }, [isFreePlay])

  useEffect(() => {
    if (!activeNpc) {
      return
    }

    clearPendingTimeouts()
    const nextTicket = toTicketData(activeNpc)

    const schedule = (callback: () => void, delayMs: number) => {
      const timeoutId = window.setTimeout(callback, delayMs)
      timeoutsRef.current.push(timeoutId)
    }

    const startMoveDelayMs = 80
    const startTalkingDelayMs = startMoveDelayMs + BEAR_MOVE_IN_MS + BEAR_PRE_TALK_DELAY_MS
    const startExitDelayMs = startTalkingDelayMs + BEAR_TALKING_DURATION_MS
    const finishDelayMs = startExitDelayMs + BEAR_EXIT_MS + BEAR_RESET_DELAY_MS

    schedule(() => {
      beginNewOrder()
      setBearExpressionIndex(0)
      setBearTransitionMs(0)
      setPhase('spawn')
    }, 0)

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
      if (tutorialStepRef.current === 'take-order') {
        setOrderStationStep('customer-talking')
      }
    }, startTalkingDelayMs)

    schedule(() => {
      setBearExpressionIndex(0)
      markOrderFullyRevealed()
      setBearTransitionMs(BEAR_EXIT_MS)
      setPhase('exiting')
    }, startExitDelayMs)

    schedule(() => {
      setBearTransitionMs(0)
      setPhase('idle')
      setActiveNpc(null)
      if (tutorialStepRef.current === 'customer-talking') {
        setOrderStationStep('order-ticket')
      }
    }, finishDelayMs)

    return clearPendingTimeouts
  }, [
    activeNpc,
    beginNewOrder,
    clearPendingTimeouts,
    markOrderFullyRevealed,
    setOrderStationStep,
    showGeneratedOrder,
  ])

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

  const customerBearLeftPct = isExiting
    ? CUSTOMER_BEAR_EXIT_LEFT_PCT
    : isAtCounter
      ? CUSTOMER_BEAR_TARGET_LEFT_PCT
      : CUSTOMER_BEAR_START_LEFT_PCT
  const customerBearTopPct =
    isAtCounter || isExiting ? CUSTOMER_BEAR_TARGET_TOP_PCT : CUSTOMER_BEAR_START_TOP_PCT
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
  const activeTutorialStep = isTutorialGameplayMode(dayState?.day) ? orderStationStep : null
  const isWelcomeTutorialStep = activeTutorialStep === 'welcome'
  const isInteractionLocked = phase !== 'idle' || activeNpc !== null || isWelcomeTutorialStep
  const shouldRenderCustomer = activeNpc !== null || (!isWelcomeTutorialStep && waitingNpcs.length > 0)
  const isCustomerClickable = !isInteractionLocked && waitingNpcs.length > 0
  const tutorialMessage =
    activeTutorialStep && activeTutorialStep !== 'complete'
      ? ORDER_STATION_TUTORIAL_MESSAGES[activeTutorialStep]
      : null
  const shouldShowTutorialContinue =
    activeTutorialStep === 'welcome' || activeTutorialStep === 'order-ticket'

  const handleStageClick = (event: MouseEvent<HTMLElement>) => {
    if (activeTutorialStep === 'welcome') {
      setOrderStationStep('take-order')
      return
    }

    if (activeTutorialStep === 'order-ticket') {
      setOrderStationStep('complete')
      return
    }

    if (isInteractionLocked || waitingNpcs.length === 0) {
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

    const nextNpc = waitingNpcs[0]
    if (!nextNpc) {
      return
    }

    claimWaitingNpc(nextNpc.npcId)
    setActiveNpc(nextNpc)
  }

  return (
    <main
      className="station-page order-station-page"
      aria-label="Order station page"
      onClick={handleStageClick}
    >
      <section className="station-stage" ref={stationStageRef}>
        <img className="station-background" src={matchaInterior} alt="" draggable="false" />
        {shouldRenderCustomer && (
          <img
            className={`order-bear-customer${isCustomerClickable ? ' is-clickable' : ''}`}
            src={TALKING_BEAR_EXPRESSIONS[bearExpressionIndex]}
            alt=""
            draggable="false"
            style={customerBearStyle}
          />
        )}
        <img className="order-counter" src={orderCounter} alt="" draggable="false" />
        <img className="order-bearista" src={bearista} alt="" draggable="false" />
        {isFreePlay && isFreePlayIntroVisible && (
          <p className="station-level-banner station-freeplay-intro">Free play mode</p>
        )}
        {isFreePlay && (
          <aside className="station-tutorial-message station-freeplay-message" aria-live="polite">
            <p>
              Welcome to free play mode. There are no customers, so feel free to make whatever
              drinks you want.
            </p>
          </aside>
        )}
        {isLevelBannerVisible && isTutorialGameplayMode(dayState?.day) && (
          <p className="station-level-banner">Level {dayState!.day.level}</p>
        )}
        {tutorialMessage && (
          <aside className="station-tutorial-message" aria-live="polite">
            <p>{tutorialMessage}</p>
            {shouldShowTutorialContinue && (
              <span className="station-tutorial-next">
                Click anywhere to continue
              </span>
            )}
          </aside>
        )}
        {phase === 'talking' && (
          <img className="order-speech-bubble" src={speechBubble} alt="" draggable="false" />
        )}
        {dayStartError && (
          <p className="station-day-error" role="alert">
            Could not start the game day.
          </p>
        )}
        {!isFreePlay && (
          <OrderTicketBoard
            ticketStore={ticketStore}
            showOrderTicketText={showOrderTicketText}
            revealedOrderLineCount={revealedOrderLineCount}
            onHistoryTicketClick={swapMainWithHistory}
            disabled={isInteractionLocked}
          />
        )}
        <StationDock currentStation="order" disabled={isInteractionLocked} />
      </section>
    </main>
  )
}

export default OrderStationPage
