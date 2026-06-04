import { useEffect, useRef, useState } from 'react'
import stationTable from '../assets/station-shared/station-table.png'
import OrderTicketBoard from '../components/OrderTicketBoard'
import StationDock from '../components/StationDock'
import readyButton from '../assets/ready_button.png'
import { useDrinkProgress } from '../DrinkProgressContext'
import { getCupPreviewSrc, type BaseCupSnapshot } from '../drinkCup'
import { MATCHA_TIN_TO_GRADE, matchaGradeToTin } from '../utils/drinkMappings'
import type { BowlMatchaLevel, MatchaTin } from '../stationProgress'
import { useOrderTicketsContext } from '../OrderTicketsContext'
import { useTutorialContext, type WhiskingStationTutorialStep } from '../TutorialContext'
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
type KettleState = 'original' | 'pouring-over-bowl' | 'returning'
type WhiskState = 'original' | 'whisking' | 'returning'
type BowlAnimPhase = 'idle' | 'over-cup' | 'returning'

const BOWL_TRAVEL_MS = 650
const BOWL_POUR_HOLD_MS = 500
const BOWL_RETURN_MS = 650

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
    'Excellent whisking! Now click the bowl to pour the whisked matcha into the cup. Then click the Ready button to send it to the next station.',
}

function WhiskingStationPage() {
  const { ticketStore, showOrderTicketText, revealedOrderLineCount, swapMainWithHistory } =
    useOrderTicketsContext()
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
  const { bowlMatchaLevel, bowlHasWater, isWhisked, totalWeight, selectedMatchaTin } =
    whiskingStation

  const cupWaitingForTopping = Boolean(whiskingCup?.hasBaseDrink)
  const tutorialStepRef = useRef(whiskingStationStep)



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
  const [whiskState, setWhiskState] = useState<WhiskState>('original')
  const [bowlAnimPhase, setBowlAnimPhase] = useState<BowlAnimPhase>('idle')
  const [cupShooting, setCupShooting] = useState(false)
  const [departingCup, setDepartingCup] = useState<BaseCupSnapshot | null>(null)
  const pendingTimeoutsRef = useRef<number[]>([])

  useEffect(() => {
    tutorialStepRef.current = whiskingStationStep
  }, [whiskingStationStep])

  const isBowlAnimating = bowlAnimPhase !== 'idle'
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
    if (spoonState !== 'empty-original' || bowlMatchaLevel === '4' || isBowlAnimating) return
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
    return !canUseMatchaTin(tin) || isBowlAnimating
  }

  function handleKettleClick() {
    if (kettleState !== 'original' || bowlMatchaLevel === 'empty' || isBowlAnimating) return
    setKettleState('pouring-over-bowl')
    trackTimeout(() => {
      updateWhiskingStation((prev) => ({
        bowlHasWater: true,
        totalWeight: prev.totalWeight + 60,
        isWhisked: false,
      }))
      setKettleState('returning')
      if (tutorialStepRef.current === 'add-water') {
        setWhiskingStationStep('whisk')
      }
    }, 600)
    trackTimeout(() => {
      setKettleState('original')
    }, 1200)
  }

  function handleWhiskClick() {
    if (whiskState !== 'original' || !bowlHasWater || isBowlAnimating) return
    setWhiskState('whisking')
    trackTimeout(() => {
      updateWhiskingStation({ isWhisked: true })
      setWhiskState('returning')
      if (tutorialStepRef.current === 'whisk') {
        setWhiskingStationStep('pour-into-cup')
      }
    }, 2000)
    trackTimeout(() => {
      setWhiskState('original')
    }, 2600)
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
    whiskingStationStep && whiskingStationStep !== 'complete'
      ? WHISKING_STATION_TUTORIAL_MESSAGES[whiskingStationStep]
      : null
  const shouldShowTutorialContinue = whiskingStationStep === 'welcome'
  const isWelcomeTutorialStep = whiskingStationStep === 'welcome'
  const isInteractionLocked = isWelcomeTutorialStep

  function handleStageClick() {
    if (whiskingStationStep === 'welcome') {
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
      setWhiskingStationStep('complete')
    }
  }

  function handleCupShootAnimationEnd() {
    if (!cupShooting) return
    setCupShooting(false)
    setDepartingCup(null)
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
    if (bowlAnimPhase === 'over-cup') {
      return 'whisking-empty-bowl whisking-empty-bowl-over-cup'
    }
    if (bowlAnimPhase === 'returning') {
      return 'whisking-empty-bowl whisking-empty-bowl-returning'
    }
    return 'whisking-empty-bowl'
  }

  return (
    <main className="station-page" aria-label="Whisking station page" onClick={handleStageClick}>
      <section className="station-stage">
        <img className="station-background" src={stationTable} alt="" draggable="false" />
        <OrderTicketBoard
          ticketStore={ticketStore}
          showOrderTicketText={showOrderTicketText}
          revealedOrderLineCount={revealedOrderLineCount}
          onHistoryTicketClick={swapMainWithHistory}
          disabled={isInteractionLocked}
        />
        <img className="matcha-scale" src={matchaScaleZero} alt="" draggable="false" />
        <div className="bowl-weight-display">{totalWeight}g</div>
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
          className={
            whiskState === 'whisking'
              ? 'whisking-whisk-over-bowl whisking-animation'
              : whiskState === 'returning'
                ? 'whisking-whisk-over-bowl'
                : 'whisking-whisk'
          }
          src={whisk}
          alt=""
          draggable="false"
          onClick={handleWhiskClick}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
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
          className={kettleState === 'original' ? 'whisking-kettle' : 'whisking-kettle-over-bowl'}
          src={kettleState === 'pouring-over-bowl' ? kettleWater : kettle}
          alt=""
          draggable="false"
          onClick={handleKettleClick}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        />
        <img
          className="whisking-matcha-tin-1"
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
          className="whisking-matcha-tin-2"
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
          className="whisking-matcha-tin-3"
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
            className={`whisking-cup-preview whisking-cup-preview--${cupOnStage.size}${cupShooting ? ' is-shooting' : ''}`}
            src={getCupPreviewSrc(cupOnStage)}
            alt=""
            draggable="false"
            onAnimationEnd={handleCupShootAnimationEnd}
          />
        )}
        {showReadyButton && (
          <button
            type="button"
            className="station-ready-button"
            aria-label="Ready"
            onClick={handleReadyClick}
          >
            <img src={readyButton} alt="" draggable={false} />
          </button>
        )}
        <StationDock currentStation="whisking" disabled={isInteractionLocked} />
      </section>
    </main>
  )
}

export default WhiskingStationPage
