import { useEffect, useRef, useState } from 'react'
import stationTable from '../assets/station-shared/station-table.png'
import OrderTicketBoard from '../components/OrderTicketBoard'
import StationDock from '../components/StationDock'
import readyButton from '../assets/ready_button.png'
import { useDrinkProgress } from '../DrinkProgressContext'
import { getCupPreviewSrc } from '../drinkCup'
import { MATCHA_TIN_TO_GRADE, matchaGradeToTin } from '../utils/drinkMappings'
import type { BowlMatchaLevel, MatchaTin } from '../stationProgress'
import { useOrderTicketsContext } from '../OrderTicketsContext'
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

const CUP_SHOOT_MS = 900
const BOWL_TRAVEL_MS = 650
const BOWL_POUR_HOLD_MS = 500
const BOWL_RETURN_MS = 650

function WhiskingStationPage() {
  const { ticketStore, showOrderTicketText, revealedOrderLineCount, swapMainWithHistory } =
    useOrderTicketsContext()
  const {
    drinkAtWhisking,
    drinkAtTopping,
    benchMatcha,
    updateDrink,
    setBenchMatcha,
    whiskingStation,
    updateWhiskingStation,
    whiskingCup,
    updateWhiskingCup,
    sendCupToTopping,
  } = useDrinkProgress()
  const { bowlMatchaLevel, bowlHasWater, isWhisked, totalWeight, selectedMatchaTin } =
    whiskingStation

  function getLockedMatchaTin(): MatchaTin | null {
    if (selectedMatchaTin) {
      return selectedMatchaTin
    }
    const grade = drinkAtWhisking?.recipe.matcha ?? benchMatcha
    return grade ? matchaGradeToTin(grade) : null
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
  const cupSendFinishedRef = useRef(false)
  const pendingTimeoutsRef = useRef<number[]>([])

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
    const matcha = MATCHA_TIN_TO_GRADE[tin]
    if (drinkAtWhisking) {
      updateDrink(drinkAtWhisking.id, { recipe: { matcha } })
    } else {
      setBenchMatcha(matcha)
    }
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
      updateWhiskingStation({
        bowlMatchaLevel: 'empty',
        bowlHasWater: false,
        isWhisked: false,
        totalWeight: 0,
      })
      setBowlAnimPhase('returning')
    }, BOWL_TRAVEL_MS + BOWL_POUR_HOLD_MS)
    trackTimeout(() => {
      setBowlAnimPhase('idle')
    }, BOWL_TRAVEL_MS + BOWL_POUR_HOLD_MS + BOWL_RETURN_MS)
  }

  function finishSendCupToTopping() {
    if (cupSendFinishedRef.current || !whiskingCup) return
    cupSendFinishedRef.current = true
    sendCupToTopping(whiskingCup)
    setCupShooting(false)
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
    cupSendFinishedRef.current = false
    setCupShooting(true)
    trackTimeout(() => {
      finishSendCupToTopping()
    }, CUP_SHOOT_MS)
  }

  function handleCupShootAnimationEnd() {
    if (!cupShooting) return
    finishSendCupToTopping()
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
    <main className="station-page" aria-label="Whisking station page">
      <section className="station-stage">
        <img className="station-background" src={stationTable} alt="" draggable="false" />
        <OrderTicketBoard
          ticketStore={ticketStore}
          showOrderTicketText={showOrderTicketText}
          revealedOrderLineCount={revealedOrderLineCount}
          onHistoryTicketClick={swapMainWithHistory}
        />
        <img className="matcha-scale" src={matchaScaleZero} alt="" draggable="false" />
        <div className="bowl-weight-display">{totalWeight}g</div>
        <div className="regular-label">Regular</div>
        <div className="premium-label">Premium</div>
        <div className="ultra-label">Ultra</div>
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
        {whiskingCup && (
          <img
            className={`whisking-cup-preview whisking-cup-preview--${whiskingCup.size}${cupShooting ? ' is-shooting' : ''}`}
            src={getCupPreviewSrc(whiskingCup)}
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
        <StationDock currentStation="whisking" />
      </section>
    </main>
  )
}

export default WhiskingStationPage
