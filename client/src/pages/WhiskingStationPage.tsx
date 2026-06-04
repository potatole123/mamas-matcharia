import { useEffect, useRef, useState, type CSSProperties } from 'react'
import stationTable from '../assets/station-shared/station-table.png'
import OrderTicketBoard from '../components/OrderTicketBoard'
import StationDock from '../components/StationDock'
import { useDrinkProgress } from '../DrinkProgressContext'
import { getCupPreviewSrc, type BaseCupSnapshot } from '../drinkCup'
import { MATCHA_TIN_TO_GRADE, matchaGradeToTin } from '../utils/drinkMappings'
import { WHISK_DURATION_MS, type BowlMatchaLevel, type MatchaTin } from '../stationProgress'
import { useGameDayContext } from '../GameDayContext'
import { useOrderTicketsContext } from '../OrderTicketsContext'
import { useTutorialContext, type WhiskingStationTutorialStep } from '../TutorialContext'
import { isFreePlayMode, isTutorialGameplayMode } from '../utils/gameMode'
import emptyBowl from '../assets/whisking-station/empty-bowl.png'
import bowlWithMatcha1 from '../assets/whisking-station/bowl-with-matcha-1.png'
import bowlWithMatcha2 from '../assets/whisking-station/bowl-with-matcha-2.png'
import bowlWithMatcha3 from '../assets/whisking-station/bowl-with-matcha-3.png'
import bowlWithMatcha4 from '../assets/whisking-station/bowl-with-matcha-4.png'
import bowlWithMatcha5 from '../assets/whisking-station/bowl-with-matcha-5.png'
import bowlWithMatcha6 from '../assets/whisking-station/bowl-with-matcha-6.png'
import matchaPowderWithWater from '../assets/whisking-station/matcha-powder-with-water.png'
import whiskedMatcha from '../assets/whisking-station/whisked-matcha.png'
import whisk from '../assets/whisking-station/whisk.png'
import emptySpoon from '../assets/whisking-station/empty-spoon.png'
import spoonWithMatcha from '../assets/whisking-station/spoon-with-matcha.png'
import kettle from '../assets/whisking-station/kettle.png'
import kettleWater from '../assets/whisking-station/kettle-water.png'
import matchaScaleZero from '../assets/whisking-station/matcha-scale-zero.png'
import matchaTin from '../assets/whisking-station/matcha-tin.png'
import './StationPage.css'

type SpoonState = 'empty-original' | 'matcha-over-bowl' | 'empty-return'
type KettleState = 'original' | 'moving-over-bowl' | 'pouring-over-bowl' | 'returning'
type BowlAnimPhase = 'idle' | 'over-cup' | 'returning'

const BOWL_TRAVEL_MS = 650
const BOWL_POUR_HOLD_MS = 500
const BOWL_RETURN_MS = 650
const KETTLE_TRAVEL_MS = 600
const KETTLE_POUR_MS = 450
const KETTLE_RETURN_MS = 600
const WHISK_PROGRESS_TICK_MS = 50

const WHISKING_STATION_TUTORIAL_MESSAGES: Record<
  Exclude<WhiskingStationTutorialStep, 'complete'>,
  string
> = {
  welcome:
    'Welcome to the whisking station! Here you\'ll prepare the matcha base for your drinks. Let\'s learn how to make a perfect cup of matcha.',
  'add-matcha':
    'First, click on one of the matcha tins (Regular, Premium, or Ultra) to add 1g of matcha powder to the bowl. The order ticket shows which grade you need. You will need around 3g-4g of matcha powder for a regular matcha.',
  'add-water':
    'Great! Now click the kettle to pour hot water into the bowl with the matcha powder. Every pour will be 60g of water.',
  whisk:
    'Perfect! Now click the whisk to blend the matcha and water together until it\'s smooth and frothy.',
  'pour-into-cup':
    'Excellent whisking! Now click the bowl to pour the whisked matcha into the cup. Then click the arrow button to send it to the next station.',
  'go-to-topping': 'Now click Topping Station to keep building the drink.',
}

function WhiskingStationPage() {
  const { ticketStore, showOrderTicketText, revealedOrderLineCount, swapMainWithHistory } =
    useOrderTicketsContext()
  const { dayState } = useGameDayContext()
  const { whiskingStationStep, setWhiskingStationStep } = useTutorialContext()
  const {
    drinkAtWhisking,
    drinkAtTopping,
    benchMatcha,
    updateDrink,
    setBenchMatcha,
    clearBenchMatcha,
    whiskingStation,
    updateWhiskingStation,
    whiskingCup,
    updateWhiskingCup,
    sendCupToTopping,
  } = useDrinkProgress()
  const { bowlMatchaLevel, bowlHasWater, isWhisked, totalWeight, selectedMatchaTin, whiskStartedAt } =
    whiskingStation

  const cupWaitingForTopping = Boolean(whiskingCup?.hasBaseDrink)
  const isFreePlay = isFreePlayMode(dayState?.day)
  const activeTutorialStep = isTutorialGameplayMode(dayState?.day) ? whiskingStationStep : null
  const tutorialStepRef = useRef<WhiskingStationTutorialStep | null>(activeTutorialStep)



  function getLockedMatchaTin(): MatchaTin | null {
    if (selectedMatchaTin) {
      return selectedMatchaTin
    }
    if (benchMatcha) {
      return matchaGradeToTin(benchMatcha)
    }
    if (!cupWaitingForTopping && drinkAtWhisking?.recipe.matcha) {
      return matchaGradeToTin(drinkAtWhisking.recipe.matcha)
    }
    return null
  }

  function canUseMatchaTin(tin: MatchaTin) {
    const locked = getLockedMatchaTin()
    return locked === null || locked === tin
  }

  const [spoon1State, setSpoon1State] = useState<SpoonState>('empty-original')
  const [spoon2State, setSpoon2State] = useState<SpoonState>('empty-original')
  const [spoon3State, setSpoon3State] = useState<SpoonState>('empty-original')
  const [kettleState, setKettleState] = useState<KettleState>('original')
  const [bowlAnimPhase, setBowlAnimPhase] = useState<BowlAnimPhase>('idle')
  const [, setWhiskProgressTick] = useState(0)
  const [cupShooting, setCupShooting] = useState(false)
  const wasWhiskedRef = useRef(isWhisked)
  const [departingCup, setDepartingCup] = useState<BaseCupSnapshot | null>(null)
  const pendingTimeoutsRef = useRef<number[]>([])

  const isBowlAnimating = bowlAnimPhase !== 'idle'
  const isWhiskBusy = whiskStartedAt !== null
  const whiskProgress =
    whiskStartedAt === null
      ? 0
      : Math.min(100, ((Date.now() - whiskStartedAt) / WHISK_DURATION_MS) * 100)
  const canUseKettle =
    kettleState === 'original' &&
    bowlMatchaLevel !== 'empty' &&
    !isBowlAnimating &&
    !isWhiskBusy
  const canUseWhisk =
    whiskStartedAt === null && bowlHasWater && !isBowlAnimating && !isWhisked
  const canUseMatchaTins = !isBowlAnimating && !isWhiskBusy
  const canPourIntoCup = Boolean(
    whiskingCup?.hasMilk && !whiskingCup.hasBaseDrink && isWhisked && !isBowlAnimating,
  )
  const showReadyButton = Boolean(
    drinkAtWhisking &&
      !drinkAtTopping &&
      whiskingCup?.hasBaseDrink &&
      !cupShooting &&
      !isBowlAnimating,
  )

  function trackTimeout(callback: () => void, delayMs: number) {
    const timeoutId = window.setTimeout(callback, delayMs)
    pendingTimeoutsRef.current.push(timeoutId)
  }

  function clearPendingTimeouts() {
    pendingTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    pendingTimeoutsRef.current = []
  }

  useEffect(() => () => clearPendingTimeouts(), [])

  useEffect(() => {
    tutorialStepRef.current = activeTutorialStep
  }, [activeTutorialStep])

  useEffect(() => {
    if (whiskStartedAt === null) {
      return
    }
    const intervalId = window.setInterval(() => {
      setWhiskProgressTick((tick) => tick + 1)
    }, WHISK_PROGRESS_TICK_MS)
    return () => window.clearInterval(intervalId)
  }, [whiskStartedAt])

  useEffect(() => {
    if (!wasWhiskedRef.current && isWhisked && tutorialStepRef.current === 'whisk') {
      setWhiskingStationStep('pour-into-cup')
    }
    wasWhiskedRef.current = isWhisked
  }, [isWhisked, setWhiskingStationStep])

  function incrementMatchaLevel() {
    updateWhiskingStation((prev) => {
      const level = prev.bowlMatchaLevel
      const nextLevel: BowlMatchaLevel =
        level === 'empty'
          ? '1'
          : level === '1'
            ? '2'
            : level === '2'
              ? '3'
              : level === '3'
                ? '4'
                : level === '4'
                  ? '5'
                  : level === '5'
                    ? '6'
                    : level
      return {
        bowlMatchaLevel: nextLevel,
        totalWeight: prev.totalWeight + 1,
        isWhisked: false,
        whiskStartedAt: null,
      }
    })
  }

  function runSpoonCycle(setSpoonState: (state: SpoonState) => void) {
    setSpoonState('matcha-over-bowl')
    trackTimeout(() => {
      incrementMatchaLevel()
      setSpoonState('empty-return')
    }, 600)
    trackTimeout(() => {
      setSpoonState('empty-original')
    }, 1200)
  }

  function setMatchaGradeFromTin(tin: MatchaTin) {
    setBenchMatcha(MATCHA_TIN_TO_GRADE[tin])
  }

  function handleMatchaTinClick(
    tin: MatchaTin,
    spoonState: SpoonState,
    setSpoonState: (state: SpoonState) => void,
  ) {
    if (spoonState !== 'empty-original' || bowlMatchaLevel === '4' || isBowlAnimating || isWhiskBusy)
      return
    if (!canUseMatchaTin(tin)) return

    if (!selectedMatchaTin) {
      updateWhiskingStation({ selectedMatchaTin: tin })
    }
    setMatchaGradeFromTin(tin)
    runSpoonCycle(setSpoonState)

    if (tutorialStepRef.current === 'add-matcha' && totalWeight >= 2) {
      setWhiskingStationStep('add-water')
    }
  }

  function handleMatchaTin1Click() {
    handleMatchaTinClick(1, spoon1State, setSpoon1State)
  }

  function handleMatchaTin2Click() {
    handleMatchaTinClick(2, spoon2State, setSpoon2State)
  }

  function handleMatchaTin3Click() {
    handleMatchaTinClick(3, spoon3State, setSpoon3State)
  }

  function tinIsDisabled(tin: MatchaTin) {
    return !canUseMatchaTins || !canUseMatchaTin(tin)
  }

  function handleKettleClick() {
    if (!canUseKettle) return
    setKettleState('moving-over-bowl')
    trackTimeout(() => {
      setKettleState('pouring-over-bowl')
    }, KETTLE_TRAVEL_MS)
    trackTimeout(() => {
      updateWhiskingStation((prev) => ({
        bowlHasWater: true,
        totalWeight: prev.totalWeight + 60,
        isWhisked: false,
        whiskStartedAt: null,
      }))
      setKettleState('returning')
      if (tutorialStepRef.current === 'add-water') {
        setWhiskingStationStep('whisk')
      }
    }, KETTLE_TRAVEL_MS + KETTLE_POUR_MS)
    trackTimeout(() => {
      setKettleState('original')
    }, KETTLE_TRAVEL_MS + KETTLE_POUR_MS + KETTLE_RETURN_MS)
  }

  function handleWhiskClick() {
    if (!canUseWhisk) return
    updateWhiskingStation({ whiskStartedAt: Date.now() })
  }

  function handleBowlClick() {
    if (!canPourIntoCup) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setBowlAnimPhase('over-cup')
      })
    })
    trackTimeout(() => {
      updateWhiskingCup({ hasBaseDrink: true })
      if (drinkAtWhisking && benchMatcha) {
        updateDrink(drinkAtWhisking.id, { recipe: { matcha: benchMatcha } })
      }
      updateWhiskingStation({
        bowlMatchaLevel: 'empty',
        bowlHasWater: false,
        isWhisked: false,
        totalWeight: 0,
        selectedMatchaTin: null,
        whiskStartedAt: null,
      })
      clearBenchMatcha()
      setBowlAnimPhase('returning')
    }, BOWL_TRAVEL_MS + BOWL_POUR_HOLD_MS)
    trackTimeout(() => {
      setBowlAnimPhase('idle')
    }, BOWL_TRAVEL_MS + BOWL_POUR_HOLD_MS + BOWL_RETURN_MS)
  }

  const cupOnStage = whiskingCup ?? departingCup

  const tutorialMessage =
    activeTutorialStep && activeTutorialStep !== 'complete'
      ? WHISKING_STATION_TUTORIAL_MESSAGES[activeTutorialStep]
      : null
  const shouldShowTutorialContinue = activeTutorialStep === 'welcome'
  const isWelcomeTutorialStep = activeTutorialStep === 'welcome'
  const isInteractionLocked = isWelcomeTutorialStep

  function handleStageClick() {
    if (activeTutorialStep === 'welcome') {
      setWhiskingStationStep('add-matcha')
    }
  }

  function handleReadyClick() {
    if (
      !drinkAtWhisking ||
      drinkAtTopping ||
      !whiskingCup?.hasBaseDrink ||
      isBowlAnimating ||
      cupShooting
    )
      return
    setDepartingCup(whiskingCup)
    sendCupToTopping(whiskingCup)
    setCupShooting(true)
    if (tutorialStepRef.current === 'pour-into-cup') {
      setWhiskingStationStep('go-to-topping')
    }
  }

  function handleCupShootAnimationEnd() {
    if (!cupShooting) return
    setCupShooting(false)
    setDepartingCup(null)
  }

  function getWhiskingCupPreviewClassName(cup: BaseCupSnapshot) {
    const phase = cup.hasBaseDrink
      ? 'base'
      : cup.hasMilk
        ? 'milk'
        : cup.iceLevel !== 'none'
          ? `ice-${cup.iceLevel}`
          : 'empty'

    return `whisking-cup-preview whisking-cup-preview--${cup.size} whisking-cup-preview--${cup.size}-${phase}${
      cupShooting ? ' is-shooting' : ''
    }`
  }

  function getBowlImage() {
    if (isWhisked) {
      return whiskedMatcha
    }
    if (bowlHasWater) {
      return matchaPowderWithWater
    }
    switch (bowlMatchaLevel) {
      case 'empty':
        return emptyBowl
      case '1':
        return bowlWithMatcha1
      case '2':
        return bowlWithMatcha2
      case '3':
        return bowlWithMatcha3
      case '4':
        return bowlWithMatcha4
      case '5':
        return bowlWithMatcha5
      case '6':
        return bowlWithMatcha6
      default:
        return emptyBowl
    }
  }

  function getBowlClassName() {
    const highlightClass =
      activeTutorialStep === 'pour-into-cup' && canPourIntoCup ? ' is-tutorial-highlight' : ''

    if (bowlAnimPhase === 'over-cup') {
      return `whisking-empty-bowl whisking-empty-bowl-over-cup${highlightClass}`
    }
    if (bowlAnimPhase === 'returning') {
      return `whisking-empty-bowl whisking-empty-bowl-returning${highlightClass}`
    }
    return `whisking-empty-bowl${highlightClass}`
  }

  function getWhiskClassName() {
    const baseClass = isWhiskBusy
      ? 'whisking-whisk-over-bowl whisking-animation'
      : 'whisking-whisk'
    const shouldHighlight = activeTutorialStep === 'whisk' && canUseWhisk
    return `${baseClass}${shouldHighlight ? ' is-tutorial-highlight' : ''}`
  }

  function getWhiskAnimationStyle(): CSSProperties | undefined {
    if (!isWhiskBusy || whiskStartedAt === null) {
      return undefined
    }
    const elapsedSeconds = (Date.now() - whiskStartedAt) / 1000
    return { animationDelay: `-${elapsedSeconds}s` }
  }

  function getKettleClassName() {
    const baseClass =
      kettleState === 'original' || kettleState === 'returning'
        ? 'whisking-kettle'
        : 'whisking-kettle-over-bowl'
    const shouldHighlight = activeTutorialStep === 'add-water' && canUseKettle
    return `${baseClass}${shouldHighlight ? ' is-tutorial-highlight' : ''}`
  }

  function getMatchaTinClassName(tin: MatchaTin) {
    const shouldHighlight = activeTutorialStep === 'add-matcha' && !tinIsDisabled(tin)
    return `whisking-matcha-tin-${tin}${shouldHighlight ? ' is-tutorial-highlight' : ''}`
  }

  function handleStationNavigate(station: 'order' | 'base' | 'whisking' | 'topping') {
    if (activeTutorialStep === 'go-to-topping' && station === 'topping') {
      setWhiskingStationStep('complete')
    }
  }

  return (
    <main className="station-page" aria-label="Whisking station page" onClick={handleStageClick}>
      <section className="station-stage">
        <img className="station-background" src={stationTable} alt="" draggable="false" />
        {!isFreePlay && (
          <OrderTicketBoard
            ticketStore={ticketStore}
            showOrderTicketText={showOrderTicketText}
            revealedOrderLineCount={revealedOrderLineCount}
            onHistoryTicketClick={swapMainWithHistory}
            disabled={isInteractionLocked}
          />
        )}
        <img className="matcha-scale" src={matchaScaleZero} alt="" draggable="false" />
        <div className="bowl-weight-display">{totalWeight}g</div>
        {whiskStartedAt !== null && (
          <div
            className="whisking-progress"
            role="progressbar"
            aria-valuenow={Math.round(whiskProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Whisking matcha progress"
          >
            <span className="whisking-progress__label">Whisking matcha</span>
            <div className="whisking-progress__track">
              <div
                className="whisking-progress__fill"
                style={{ width: `${whiskProgress}%` }}
              />
            </div>
          </div>
        )}
        <div className="regular-label">Regular</div>
        <div className="premium-label">Premium</div>
        <div className="ultra-label">Ultra</div>
        {tutorialMessage && (
          <aside className="station-tutorial-message" aria-live="polite">
            <p>{tutorialMessage}</p>
            {shouldShowTutorialContinue && (
              <span className="station-tutorial-next">
                Click anywhere to continue <b aria-hidden="true">›</b>
              </span>
            )}
          </aside>
        )}
        <img
          className={getBowlClassName()}
          src={getBowlImage()}
          alt=""
          draggable="false"
          onClick={handleBowlClick}
          style={{ cursor: canPourIntoCup ? 'pointer' : 'default', pointerEvents: 'auto' }}
        />
        <img
          className={getWhiskClassName()}
          src={whisk}
          alt=""
          draggable="false"
          onClick={handleWhiskClick}
          style={{
            cursor: canUseWhisk ? 'pointer' : 'default',
            pointerEvents: 'auto',
            ...getWhiskAnimationStyle(),
          }}
        />
        <img
          className={
            spoon1State === 'matcha-over-bowl' || spoon1State === 'empty-return'
              ? 'whisking-spoon-1-over-bowl'
              : 'whisking-empty-spoon-1'
          }
          src={spoon1State === 'matcha-over-bowl' ? spoonWithMatcha : emptySpoon}
          alt=""
          draggable="false"
        />
        <img
          className={
            spoon2State === 'matcha-over-bowl' || spoon2State === 'empty-return'
              ? 'whisking-spoon-2-over-bowl'
              : 'whisking-empty-spoon-2'
          }
          src={spoon2State === 'matcha-over-bowl' ? spoonWithMatcha : emptySpoon}
          alt=""
          draggable="false"
        />
        <img
          className={
            spoon3State === 'matcha-over-bowl' || spoon3State === 'empty-return'
              ? 'whisking-spoon-3-over-bowl'
              : 'whisking-empty-spoon-3'
          }
          src={spoon3State === 'matcha-over-bowl' ? spoonWithMatcha : emptySpoon}
          alt=""
          draggable="false"
        />
        <img
          className={getKettleClassName()}
          src={kettleState === 'pouring-over-bowl' ? kettleWater : kettle}
          alt=""
          draggable="false"
          onClick={handleKettleClick}
          style={{ cursor: canUseKettle ? 'pointer' : 'default', pointerEvents: 'auto' }}
        />
        <img
          className={getMatchaTinClassName(1)}
          src={matchaTin}
          alt=""
          draggable="false"
          onClick={handleMatchaTin1Click}
          style={{
            cursor: tinIsDisabled(1) ? 'not-allowed' : 'pointer',
            pointerEvents: tinIsDisabled(1) ? 'none' : 'auto',
            opacity: tinIsDisabled(1) ? 0.45 : 1,
          }}
        />
        <img
          className={getMatchaTinClassName(2)}
          src={matchaTin}
          alt=""
          draggable="false"
          onClick={handleMatchaTin2Click}
          style={{
            cursor: tinIsDisabled(2) ? 'not-allowed' : 'pointer',
            pointerEvents: tinIsDisabled(2) ? 'none' : 'auto',
            opacity: tinIsDisabled(2) ? 0.45 : 1,
          }}
        />
        <img
          className={getMatchaTinClassName(3)}
          src={matchaTin}
          alt=""
          draggable="false"
          onClick={handleMatchaTin3Click}
          style={{
            cursor: tinIsDisabled(3) ? 'not-allowed' : 'pointer',
            pointerEvents: tinIsDisabled(3) ? 'none' : 'auto',
            opacity: tinIsDisabled(3) ? 0.45 : 1,
          }}
        />
        {cupOnStage && (
          <img
            className={getWhiskingCupPreviewClassName(cupOnStage)}
            src={getCupPreviewSrc(cupOnStage)}
            alt=""
            draggable="false"
            onAnimationEnd={handleCupShootAnimationEnd}
          />
        )}
        {showReadyButton && (
          <button
            type="button"
            className={`station-next-button${
              activeTutorialStep === 'pour-into-cup' ? ' is-tutorial-highlight' : ''
            }`}
            aria-label="Move cup to Topping Station"
            onClick={handleReadyClick}
          >
            <span className="station-next-button__icon" aria-hidden="true" />
          </button>
        )}
        <StationDock
          currentStation="whisking"
          disabled={isInteractionLocked}
          highlightedStation={activeTutorialStep === 'go-to-topping' ? 'topping' : null}
          onStationNavigate={handleStationNavigate}
        />
      </section>
    </main>
  )
}

export default WhiskingStationPage
