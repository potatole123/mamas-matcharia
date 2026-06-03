import { useEffect, useRef, useState } from 'react'
import stationTable from '../assets/station-shared/station-table.png'
import smallCup from '../assets/base/small.png'
import largeCup from '../assets/base/large.png'
import smallRegularIceCup from '../assets/base/small_regular_ice.png'
import largeRegularIceCup from '../assets/base/large_regular_ice.png'
import smallMilkCup from '../assets/base/small_milk.png'
import largeMilkCup from '../assets/base/large_milk.png'
import heater from '../assets/base/heater.png'
import pitcher from '../assets/base/pitcher.png'
import pitcherMilk from '../assets/base/pitcher_milk.png'
import iceBucket from '../assets/base/ice_bucket.png'
import iceSpoonEmpty from '../assets/base/ice_spoon_empty.png'
import iceSpoonFilled from '../assets/base/ice_spoon.png'
import flavorPump from '../assets/base/flavor.png'
import sweetenerJar from '../assets/base/sweetener.png'
import milkCarton from '../assets/base/milk.png'
import milkPour from '../assets/base/milk_pour.png'
import readyButton from '../assets/ready_button.png'
import OrderTicketBoard from '../components/OrderTicketBoard'
import StationDock from '../components/StationDock'
import { useOrderTicketsContext } from '../OrderTicketsContext'
import './StationPage.css'

type FlavorOption = 'strawberry' | 'mango' | 'pandan'
type SweetenerOption = 'honey' | 'agave' | 'equal'
type SweetnessLevel = 'less' | 'perfect' | 'extra'
type MilkOption = 'whole' | 'oat' | 'soy' | 'almond'
type DrinkSize = 'small' | 'large'
type IceSpoonState = 'idle' | 'has-ice' | 'filled-over-cup' | 'empty-return'
type MilkPourTarget = 'cup' | 'pitcher'
type MilkAnimPhase = 'idle' | 'over-target' | 'pouring' | 'return'
type PitcherAnimPhase = 'idle' | 'at-heater' | 'over-cup' | 'pouring' | 'return'

const EMPTY_CUP_IMAGES: Record<DrinkSize, string> = {
  small: smallCup,
  large: largeCup,
}

const REGULAR_ICE_CUP_IMAGES: Record<DrinkSize, string> = {
  small: smallRegularIceCup,
  large: largeRegularIceCup,
}

const MILK_CUP_IMAGES: Record<DrinkSize, string> = {
  small: smallMilkCup,
  large: largeMilkCup,
}

const ICE_SCOOP_DELAY_MS = 500
const ICE_MOVE_DELAY_MS = 500
const ICE_POUR_DELAY_MS = 600
const ICE_RETURN_DELAY_MS = 500

const MILK_MOVE_DELAY_MS = 800
const MILK_POUR_DELAY_MS = 900
const MILK_RETURN_DELAY_MS = 800

const PITCHER_TO_HEATER_MS = 1500
const PITCHER_TO_CUP_MS = 800
const PITCHER_ROTATE_MS = 600
const PITCHER_POUR_MS = 600
const PITCHER_RETURN_MS = 800

const FLAVOR_OPTIONS: { id: FlavorOption; label: string }[] = [
  { id: 'strawberry', label: 'Strawberry' },
  { id: 'mango', label: 'Mango' },
  { id: 'pandan', label: 'Pandan' },
]

const SWEETENER_OPTIONS: { id: SweetenerOption; label: string }[] = [
  { id: 'honey', label: 'Honey' },
  { id: 'agave', label: 'Agave' },
  { id: 'equal', label: 'Equal' },
]

const MILK_OPTIONS: { id: MilkOption; label: string }[] = [
  { id: 'whole', label: 'Whole' },
  { id: 'oat', label: 'Oat' },
  { id: 'soy', label: 'Soy' },
  { id: 'almond', label: 'Almond' },
]

function BaseStationPage() {
  const { ticketStore, showOrderTicketText, revealedOrderLineCount, swapMainWithHistory } =
    useOrderTicketsContext()
  const [drinkSize, setDrinkSize] = useState<DrinkSize>('small')
  const [cupHasIce, setCupHasIce] = useState(false)
  const [cupHasMilk, setCupHasMilk] = useState(false)
  const [pitcherHasMilk, setPitcherHasMilk] = useState(false)
  const [iceSpoonState, setIceSpoonState] = useState<IceSpoonState>('idle')
  const [activeMilk, setActiveMilk] = useState<MilkOption | null>(null)
  const [milkAnimPhase, setMilkAnimPhase] = useState<MilkAnimPhase>('idle')
  const [milkPourTarget, setMilkPourTarget] = useState<MilkPourTarget>('cup')
  const [pitcherAnimPhase, setPitcherAnimPhase] = useState<PitcherAnimPhase>('idle')
  const [selectedFlavor, setSelectedFlavor] = useState<FlavorOption | null>(null)
  const [selectedSweetener, setSelectedSweetener] = useState<SweetenerOption | null>(null)
  const [sweetnessLevel, setSweetnessLevel] = useState<SweetnessLevel | null>(null)
  const [pendingSweetener, setPendingSweetener] = useState<SweetenerOption | null>(null)
  const pendingTimeoutsRef = useRef<number[]>([])

  const isIceAnimating = iceSpoonState !== 'idle'
  const isMilkAnimating = activeMilk !== null
  const isPitcherAnimating = pitcherAnimPhase !== 'idle'
  const isStationAnimating = isIceAnimating || isMilkAnimating || isPitcherAnimating
  const canAddFlavorAndSweetener = cupHasMilk && !isStationAnimating

  function trackTimeout(callback: () => void, delayMs: number) {
    const timeoutId = window.setTimeout(callback, delayMs)
    pendingTimeoutsRef.current.push(timeoutId)
  }

  function clearPendingTimeouts() {
    pendingTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    pendingTimeoutsRef.current = []
  }

  useEffect(() => {
    return () => {
      clearPendingTimeouts()
    }
  }, [])

  function getCupPreviewImage() {
    if (cupHasMilk) {
      return MILK_CUP_IMAGES[drinkSize]
    }
    if (cupHasIce) {
      return REGULAR_ICE_CUP_IMAGES[drinkSize]
    }
    return EMPTY_CUP_IMAGES[drinkSize]
  }

  function getIceSpoonImage() {
    if (iceSpoonState === 'idle' || iceSpoonState === 'empty-return') {
      return iceSpoonEmpty
    }
    return iceSpoonFilled
  }

  function getIceSpoonClassName() {
    if (iceSpoonState === 'filled-over-cup' || iceSpoonState === 'empty-return') {
      return 'base-ice-spoon-over-cup'
    }
    return 'base-ice-spoon-rest'
  }

  function getMilkClassName(milkId: MilkOption) {
    if (activeMilk !== milkId || milkAnimPhase === 'idle') {
      return `base-milk base-milk-${milkId}`
    }

    const classes = ['base-milk', `base-milk-${milkId}`]
    classes.push(milkPourTarget === 'cup' ? 'base-milk-over-cup' : 'base-milk-over-pitcher')
    if (milkAnimPhase === 'return') {
      classes.push('base-milk-returning')
    }
    return classes.join(' ')
  }

  function getMilkImage(milkId: MilkOption) {
    if (activeMilk === milkId && milkAnimPhase === 'pouring') {
      return milkPour
    }
    return milkCarton
  }

  function getPitcherClassName() {
    if (pitcherAnimPhase === 'at-heater') {
      return 'base-pitcher base-pitcher-at-heater'
    }
    if (pitcherAnimPhase === 'pouring') {
      return 'base-pitcher base-pitcher-over-cup base-pitcher-pouring'
    }
    if (pitcherAnimPhase === 'over-cup') {
      return 'base-pitcher base-pitcher-over-cup'
    }
    if (pitcherAnimPhase === 'return') {
      return 'base-pitcher base-pitcher-return'
    }
    return 'base-pitcher base-pitcher-rest'
  }

  function getPitcherImage() {
    if (pitcherHasMilk) {
      return pitcherMilk
    }
    return pitcher
  }

  function resetBaseStation() {
    clearPendingTimeouts()
    setCupHasIce(false)
    setCupHasMilk(false)
    setPitcherHasMilk(false)
    setIceSpoonState('idle')
    setActiveMilk(null)
    setMilkAnimPhase('idle')
    setPitcherAnimPhase('idle')
    setSelectedFlavor(null)
    setSelectedSweetener(null)
    setSweetnessLevel(null)
    setPendingSweetener(null)
  }

  function handleFlavorClick(flavorId: FlavorOption) {
    if (!canAddFlavorAndSweetener || pendingSweetener) return
    setSelectedFlavor(flavorId)
  }

  function handleSweetenerClick(sweetenerId: SweetenerOption) {
    if (!canAddFlavorAndSweetener) return
    setPendingSweetener(sweetenerId)
  }

  function handleSweetnessChoice(level: SweetnessLevel) {
    if (!pendingSweetener) return
    setSelectedSweetener(pendingSweetener)
    setSweetnessLevel(level)
    setPendingSweetener(null)
  }

  function handleIceBucketClick() {
    if (isStationAnimating || cupHasIce) return

    setIceSpoonState('has-ice')

    trackTimeout(() => {
      setIceSpoonState('filled-over-cup')
    }, ICE_SCOOP_DELAY_MS)

    trackTimeout(() => {
      setCupHasIce(true)
      setIceSpoonState('empty-return')
    }, ICE_SCOOP_DELAY_MS + ICE_MOVE_DELAY_MS + ICE_POUR_DELAY_MS)

    trackTimeout(() => {
      setIceSpoonState('idle')
    }, ICE_SCOOP_DELAY_MS + ICE_MOVE_DELAY_MS + ICE_POUR_DELAY_MS + ICE_RETURN_DELAY_MS)
  }

  function handlePitcherClick() {
    if (isStationAnimating || !pitcherHasMilk || cupHasMilk) return

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPitcherAnimPhase('at-heater')
      })
    })

    trackTimeout(() => {
      setPitcherAnimPhase('over-cup')
    }, PITCHER_TO_HEATER_MS)

    trackTimeout(() => {
      setPitcherAnimPhase('pouring')
    }, PITCHER_TO_HEATER_MS + PITCHER_TO_CUP_MS)

    trackTimeout(() => {
      setCupHasMilk(true)
      setPitcherHasMilk(false)
      setPitcherAnimPhase('return')
    }, PITCHER_TO_HEATER_MS + PITCHER_TO_CUP_MS + PITCHER_ROTATE_MS + PITCHER_POUR_MS)

    trackTimeout(() => {
      setPitcherAnimPhase('idle')
    }, PITCHER_TO_HEATER_MS + PITCHER_TO_CUP_MS + PITCHER_ROTATE_MS + PITCHER_POUR_MS + PITCHER_RETURN_MS)
  }

  function handleMilkClick(milkId: MilkOption) {
    if (isStationAnimating) return

    const target: MilkPourTarget = cupHasIce ? 'cup' : 'pitcher'
    if (target === 'cup' && cupHasMilk) return
    if (target === 'pitcher' && pitcherHasMilk) return

    setMilkPourTarget(target)
    setActiveMilk(milkId)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMilkAnimPhase('over-target')
      })
    })

    trackTimeout(() => {
      setMilkAnimPhase('pouring')
    }, MILK_MOVE_DELAY_MS)

    trackTimeout(() => {
      if (target === 'cup') {
        setCupHasMilk(true)
      } else {
        setPitcherHasMilk(true)
      }
      setMilkAnimPhase('return')
    }, MILK_MOVE_DELAY_MS + MILK_POUR_DELAY_MS)

    trackTimeout(() => {
      setActiveMilk(null)
      setMilkAnimPhase('idle')
    }, MILK_MOVE_DELAY_MS + MILK_POUR_DELAY_MS + MILK_RETURN_DELAY_MS)
  }

  return (
    <main className="station-page" aria-label="Base station page">
      <section className="station-stage">
        <img className="station-background" src={stationTable} alt="" draggable="false" />
        <OrderTicketBoard
          ticketStore={ticketStore}
          showOrderTicketText={showOrderTicketText}
          revealedOrderLineCount={revealedOrderLineCount}
          onHistoryTicketClick={swapMainWithHistory}
        />
        {MILK_OPTIONS.map(({ id }) => (
          <img
            key={id}
            className={getMilkClassName(id)}
            src={getMilkImage(id)}
            alt=""
            draggable="false"
            onClick={() => handleMilkClick(id)}
            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          />
        ))}
        {MILK_OPTIONS.map(({ id, label }) => (
          <div key={`milk-label-${id}`} className={`base-label base-label-milk-${id}`}>
            {label}
          </div>
        ))}
        <img className="base-heater" src={heater} alt="" draggable="false" />
        <img
          className="base-ice-bucket"
          src={iceBucket}
          alt=""
          draggable="false"
          onClick={handleIceBucketClick}
          style={{ cursor: isStationAnimating ? 'default' : 'pointer', pointerEvents: 'auto' }}
        />
        <img
          className={getIceSpoonClassName()}
          src={getIceSpoonImage()}
          alt=""
          draggable="false"
        />
        <img
          className={getPitcherClassName()}
          src={getPitcherImage()}
          alt=""
          draggable="false"
          onClick={handlePitcherClick}
          style={{
            cursor: pitcherHasMilk && !isStationAnimating && !cupHasMilk ? 'pointer' : 'default',
            pointerEvents: 'auto',
          }}
        />
        {FLAVOR_OPTIONS.map(({ id }) => (
          <img
            key={id}
            className={`base-flavor base-flavor-${id}${selectedFlavor === id ? ' is-selected' : ''}`}
            src={flavorPump}
            alt=""
            draggable="false"
            onClick={() => handleFlavorClick(id)}
            style={{
              cursor: canAddFlavorAndSweetener && !pendingSweetener ? 'pointer' : 'default',
              pointerEvents: 'auto',
            }}
          />
        ))}
        {SWEETENER_OPTIONS.map(({ id }) => (
          <img
            key={id}
            className={`base-sweetener base-sweetener-${id}${selectedSweetener === id ? ' is-selected' : ''}`}
            src={sweetenerJar}
            alt=""
            draggable="false"
            onClick={() => handleSweetenerClick(id)}
            style={{
              cursor: canAddFlavorAndSweetener ? 'pointer' : 'default',
              pointerEvents: 'auto',
            }}
          />
        ))}
        {pendingSweetener && (
          <div
            className="base-sweetness-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="base-sweetness-popup-title"
          >
            <p id="base-sweetness-popup-title" className="base-sweetness-popup__title">
              How sweet?
            </p>
            <div className="base-sweetness-popup__actions">
              <button type="button" onClick={() => handleSweetnessChoice('less')}>
                Less
              </button>
              <button type="button" onClick={() => handleSweetnessChoice('perfect')}>
                Perfect
              </button>
              <button type="button" onClick={() => handleSweetnessChoice('extra')}>
                Extra
              </button>
            </div>
            <button
              type="button"
              className="base-sweetness-popup__cancel"
              onClick={() => setPendingSweetener(null)}
            >
              Cancel
            </button>
          </div>
        )}
        {FLAVOR_OPTIONS.map(({ id, label }) => (
          <div key={`label-${id}`} className={`base-label base-label-flavor-${id}`}>
            {label}
          </div>
        ))}
        {SWEETENER_OPTIONS.map(({ id, label }) => (
          <div key={`label-${id}`} className={`base-label base-label-sweetener-${id}`}>
            {label}
          </div>
        ))}
        <img
          className="base-cup-preview"
          src={getCupPreviewImage()}
          alt=""
          draggable="false"
        />
        <div className="base-size-toggle">
          <button
            type="button"
            className={drinkSize === 'small' ? 'is-selected' : ''}
            onClick={() => setDrinkSize('small')}
          >
            Small
          </button>
          <button
            type="button"
            className={drinkSize === 'large' ? 'is-selected' : ''}
            onClick={() => setDrinkSize('large')}
          >
            Large
          </button>
          <button type="button" onClick={resetBaseStation}>
            Reset
          </button>
        </div>
        {cupHasMilk && (
          <button type="button" className="base-ready-button" aria-label="Ready">
            <img src={readyButton} alt="" draggable={false} />
          </button>
        )}
        <StationDock currentStation="base" />
      </section>
    </main>
  )
}

export default BaseStationPage
