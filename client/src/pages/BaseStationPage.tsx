import { useEffect, useRef, useState } from 'react'
import stationTable from '../assets/station-shared/station-table.png'
import heater from '../assets/base/heater.png'
import pitcher from '../assets/base/pitcher.png'
import pitcherMilkImage from '../assets/base/pitcher_milk.png'
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
import { useDrinkProgress } from '../DrinkProgressContext'
import { cupHasIce, getCupPreviewSrc, type BaseCupSnapshot, type DrinkSize } from '../drinkCup'
import { useOrderTicketsContext } from '../OrderTicketsContext'
import { MILK_CARTON_TO_RECIPE, type MilkCartonOption } from '../utils/drinkMappings'
import type { IceLevel } from '../../../server/src/types/enums'
import type {
  FlavorOption,
  SweetenerOption,
  SweetnessLevel,
} from '../stationProgress'
import './StationPage.css'

type MilkOption = MilkCartonOption
type IceSpoonState = 'idle' | 'has-ice' | 'filled-over-cup' | 'empty-return'
type MilkPourTarget = 'cup' | 'pitcher'
type MilkAnimPhase = 'idle' | 'over-target' | 'pouring' | 'return'
type PitcherAnimPhase = 'idle' | 'at-heater' | 'over-cup' | 'pouring' | 'return'

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
  const {
    drinkAtBase,
    drinkAtWhisking,
    canCreateDrinkAtBase,
    createDrinkAtBase,
    updateDrink,
    baseStation,
    updateBaseStation,
    sendCupToWhisking,
  } = useDrinkProgress()
  const { pitcherHasMilk, pitcherMilk } = baseStation
  const cupVisual = drinkAtBase?.cupVisual
  const iceLevel = drinkAtBase?.recipe.iceLevel ?? 'none'
  const cupHasIceLevel = cupHasIce(iceLevel)
  const cupHasMilk = cupVisual?.hasMilk ?? false
  const selectedFlavor =
    drinkAtBase?.recipe.flavor && drinkAtBase.recipe.flavor !== 'none'
      ? drinkAtBase.recipe.flavor
      : null
  const selectedSweetener =
    drinkAtBase?.recipe.sweetener && drinkAtBase.recipe.sweetener !== 'none'
      ? drinkAtBase.recipe.sweetener
      : null
  const showCupSizePopup = canCreateDrinkAtBase
  const showCupOnBase = Boolean(drinkAtBase)
  const [cupShooting, setCupShooting] = useState(false)
  const [departingCup, setDepartingCup] = useState<BaseCupSnapshot | null>(null)
  const [iceSpoonState, setIceSpoonState] = useState<IceSpoonState>('idle')
  const [activeMilk, setActiveMilk] = useState<MilkOption | null>(null)
  const [milkAnimPhase, setMilkAnimPhase] = useState<MilkAnimPhase>('idle')
  const [milkPourTarget, setMilkPourTarget] = useState<MilkPourTarget>('cup')
  const [pitcherAnimPhase, setPitcherAnimPhase] = useState<PitcherAnimPhase>('idle')
  const [pendingSweetener, setPendingSweetener] = useState<SweetenerOption | null>(null)
  const [showIceLevelPopup, setShowIceLevelPopup] = useState(false)
  const pendingTimeoutsRef = useRef<number[]>([])

  const isIceAnimating = iceSpoonState !== 'idle'
  const isMilkAnimating = activeMilk !== null
  const isPitcherAnimating = pitcherAnimPhase !== 'idle'
  const isStationAnimating = isIceAnimating || isMilkAnimating || isPitcherAnimating
  const isPopupOpen = showIceLevelPopup || Boolean(pendingSweetener)
  const canAddFlavorAndSweetener = cupHasMilk && !isStationAnimating && !isPopupOpen
  const showReadyButton =
    Boolean(drinkAtBase) &&
    !drinkAtWhisking &&
    cupHasMilk &&
    !cupShooting &&
    !isStationAnimating

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

  const cupVisualOnStage = drinkAtBase?.cupVisual ?? departingCup

  function getCupPreviewImage() {
    if (!cupVisualOnStage) {
      return ''
    }
    return getCupPreviewSrc(cupVisualOnStage)
  }

  function handleCupSizeChoice(size: DrinkSize) {
    createDrinkAtBase(size)
  }

  function handleReadyClick() {
    if (!drinkAtBase || drinkAtWhisking || !cupHasMilk || isStationAnimating || cupShooting) return
    const cupSnapshot = { ...drinkAtBase.cupVisual, hasMilk: true }
    setDepartingCup(cupSnapshot)
    sendCupToWhisking(cupSnapshot)
    setCupShooting(true)
  }

  function handleCupShootAnimationEnd() {
    if (!cupShooting) return
    setCupShooting(false)
    setDepartingCup(null)
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
      return pitcherMilkImage
    }
    return pitcher
  }

  function handleFlavorClick(flavorId: FlavorOption) {
    if (!drinkAtBase || !canAddFlavorAndSweetener || pendingSweetener) return
    updateDrink(drinkAtBase.id, { recipe: { flavor: flavorId } })
  }

  function handleSweetenerClick(sweetenerId: SweetenerOption) {
    if (!canAddFlavorAndSweetener) return
    setPendingSweetener(sweetenerId)
  }

  function handleSweetnessChoice(level: SweetnessLevel) {
    if (!drinkAtBase || !pendingSweetener) return
    updateDrink(drinkAtBase.id, {
      recipe: { sweetener: pendingSweetener, sweetnessLevel: level },
    })
    setPendingSweetener(null)
  }

  function runIceScoopAnimation(level: Exclude<IceLevel, 'none'>) {
    if (!drinkAtBase) return

    setIceSpoonState('has-ice')

    trackTimeout(() => {
      setIceSpoonState('filled-over-cup')
    }, ICE_SCOOP_DELAY_MS)

    trackTimeout(() => {
      updateDrink(drinkAtBase.id, {
        recipe: { temp: 'iced', iceLevel: level },
        cupVisual: { iceLevel: level },
      })
      setIceSpoonState('empty-return')
    }, ICE_SCOOP_DELAY_MS + ICE_MOVE_DELAY_MS + ICE_POUR_DELAY_MS)

    trackTimeout(() => {
      setIceSpoonState('idle')
    }, ICE_SCOOP_DELAY_MS + ICE_MOVE_DELAY_MS + ICE_POUR_DELAY_MS + ICE_RETURN_DELAY_MS)
  }

  function handleIceBucketClick() {
    if (!drinkAtBase || isStationAnimating || cupHasIceLevel || showIceLevelPopup) return
    setShowIceLevelPopup(true)
  }

  function handleIceLevelChoice(level: Exclude<IceLevel, 'none'>) {
    setShowIceLevelPopup(false)
    runIceScoopAnimation(level)
  }

  function handlePitcherClick() {
    if (!drinkAtBase || isStationAnimating || isPopupOpen || !pitcherHasMilk || cupHasMilk) return

    const milkFromPitcher = pitcherMilk
    const keepIced = cupHasIceLevel

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
      updateDrink(drinkAtBase.id, {
        recipe: {
          ...(milkFromPitcher ? { milk: milkFromPitcher } : {}),
          temp: keepIced ? 'iced' : 'hot',
        },
        cupVisual: { hasMilk: true },
      })
      updateBaseStation({ pitcherHasMilk: false, pitcherMilk: null })
      setPitcherAnimPhase('return')
    }, PITCHER_TO_HEATER_MS + PITCHER_TO_CUP_MS + PITCHER_ROTATE_MS + PITCHER_POUR_MS)

    trackTimeout(() => {
      setPitcherAnimPhase('idle')
    }, PITCHER_TO_HEATER_MS + PITCHER_TO_CUP_MS + PITCHER_ROTATE_MS + PITCHER_POUR_MS + PITCHER_RETURN_MS)
  }

  function handleMilkClick(milkId: MilkOption) {
    if (!drinkAtBase || isStationAnimating || isPopupOpen) return

    const keepIced = cupHasIceLevel
    const target: MilkPourTarget = keepIced ? 'cup' : 'pitcher'
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
        updateDrink(drinkAtBase.id, {
          recipe: {
            milk: MILK_CARTON_TO_RECIPE[milkId],
            temp: keepIced ? 'iced' : 'hot',
          },
          cupVisual: { hasMilk: true },
        })
      } else {
        updateBaseStation({
          pitcherHasMilk: true,
          pitcherMilk: MILK_CARTON_TO_RECIPE[milkId],
        })
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
          style={{
            cursor:
              drinkAtBase && !isStationAnimating && !cupHasIceLevel && !showIceLevelPopup
                ? 'pointer'
                : 'default',
            pointerEvents: 'auto',
          }}
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
        {showIceLevelPopup && (
          <div
            className="base-sweetness-popup base-ice-level-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="base-ice-level-popup-title"
          >
            <p id="base-ice-level-popup-title" className="base-sweetness-popup__title">
              How much ice?
            </p>
            <div className="base-sweetness-popup__actions">
              <button type="button" onClick={() => handleIceLevelChoice('light')}>
                Light
              </button>
              <button type="button" onClick={() => handleIceLevelChoice('regular')}>
                Regular
              </button>
            </div>
            <button
              type="button"
              className="base-sweetness-popup__cancel"
              onClick={() => setShowIceLevelPopup(false)}
            >
              Cancel
            </button>
          </div>
        )}
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
        {showCupSizePopup && (
          <div
            className="base-cup-size-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="base-cup-size-popup-title"
          >
            <p id="base-cup-size-popup-title" className="base-cup-size-popup__title">
              Please choose cup size
            </p>
            <div className="base-cup-size-popup__actions">
              <button type="button" onClick={() => handleCupSizeChoice('small')}>
                Small
              </button>
              <button type="button" onClick={() => handleCupSizeChoice('large')}>
                Large
              </button>
            </div>
          </div>
        )}
        {(showCupOnBase || departingCup) && (
          <img
            className={`base-cup-preview${cupShooting ? ' is-shooting' : ''}`}
            src={getCupPreviewImage()}
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
        <StationDock currentStation="base" />
      </section>
    </main>
  )
}

export default BaseStationPage
