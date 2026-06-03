import { useEffect, useRef, useState } from 'react'
import stationTable from '../assets/station-shared/station-table.png'
import OrderTicketBoard from '../components/OrderTicketBoard'
import StationDock from '../components/StationDock'
import readyButton from '../assets/ready_button.png'
import { useDrinkProgress } from '../DrinkProgressContext'
import { getCupPreviewSrc } from '../drinkCup'
import { useOrderTicketsContext } from '../OrderTicketsContext'
import {
  CREAM_UI_TO_RECIPE,
  POWDER_UI_TO_RECIPE,
  type ToppingCreamOption,
  type ToppingPowderOption,
} from '../utils/drinkMappings'
import type { CreamTop, Powder } from '../../../server/src/types/enums'
import creamMatcha from '../assets/topping/matcha_cream.png'
import creamVanilla from '../assets/topping/vanilla_cream.png'
import creamUbe from '../assets/topping/ube_cream.png'
import creamYuzu from '../assets/topping/yuzu_cream.png'
import powderJar from '../assets/topping/powder.png'
import smallPowderBlackSesame from '../assets/topping/drinks_with_powder/small_black_sesame.png'
import smallPowderHojicha from '../assets/topping/drinks_with_powder/small_hojicha.png'
import smallPowderKinako from '../assets/topping/drinks_with_powder/small_kinako.png'
import smallPowderMatcha from '../assets/topping/drinks_with_powder/small_matcha_powder.png'
import largePowderBlackSesame from '../assets/topping/drinks_with_powder/large_black_sesame.png'
import largePowderHojicha from '../assets/topping/drinks_with_powder/large_hojicha.png'
import largePowderKinako from '../assets/topping/drinks_with_powder/large_kinako.png'
import largePowderMatcha from '../assets/topping/drinks_with_powder/large_matcha_powder.png'
import smallCreamMatcha from '../assets/topping/drinks_with_cream/small_matcha_cream.png'
import smallCreamVanilla from '../assets/topping/drinks_with_cream/small_vanilla_cream.png'
import smallCreamUbe from '../assets/topping/drinks_with_cream/small_ube_cream.png'
import smallCreamYuzu from '../assets/topping/drinks_with_cream/small_yuzu_cream.png'
import largeCreamMatcha from '../assets/topping/drinks_with_cream/large_matcha_cream.png'
import largeCreamVanilla from '../assets/topping/drinks_with_cream/large_vanilla_cream.png'
import largeCreamUbe from '../assets/topping/drinks_with_cream/large_ube_cream.png'
import largeCreamYuzu from '../assets/topping/drinks_with_cream/large_yuzu_cream.png'
import './StationPage.css'

type PowderOption = ToppingPowderOption
type CreamOption = ToppingCreamOption
type DrinkSize = 'small' | 'large'

const CREAM_RECIPE_TO_UI: Partial<Record<CreamTop, CreamOption>> = {
  matcha: 'matcha',
  vanilla: 'vanilla',
  ube: 'ube',
  yuzu: 'yuzu',
}

const POWDER_RECIPE_TO_UI: Partial<Record<Powder, PowderOption>> = {
  'black sesame': 'black-sesame',
  hojicha: 'hojicha',
  kinako: 'kinako',
  matcha: 'matcha',
}
type ComboPowderFolder = 'black_sesame' | 'hojicha' | 'kinako' | 'matcha_powder'

const POWDER_DRINK_IMAGES: Record<DrinkSize, Record<PowderOption, string>> = {
  small: {
    'black-sesame': smallPowderBlackSesame,
    hojicha: smallPowderHojicha,
    kinako: smallPowderKinako,
    matcha: smallPowderMatcha,
  },
  large: {
    'black-sesame': largePowderBlackSesame,
    hojicha: largePowderHojicha,
    kinako: largePowderKinako,
    matcha: largePowderMatcha,
  },
}

const CREAM_DRINK_IMAGES: Record<DrinkSize, Record<CreamOption, string>> = {
  small: {
    matcha: smallCreamMatcha,
    vanilla: smallCreamVanilla,
    ube: smallCreamUbe,
    yuzu: smallCreamYuzu,
  },
  large: {
    matcha: largeCreamMatcha,
    vanilla: largeCreamVanilla,
    ube: largeCreamUbe,
    yuzu: largeCreamYuzu,
  },
}

const COMBO_POWDER_FOLDER_BY_OPTION: Record<PowderOption, ComboPowderFolder> = {
  'black-sesame': 'black_sesame',
  hojicha: 'hojicha',
  kinako: 'kinako',
  matcha: 'matcha_powder',
}

const COMBO_DRINK_IMAGE_BY_PATH = import.meta.glob('../assets/topping/drinks_with_cream_and_*/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const CUP_SHOOT_MS = 900

function ToppingStationPage() {
  const {
    ticketStore,
    showOrderTicketText,
    revealedOrderLineCount,
    swapMainWithHistory,
    beginNewOrder,
  } = useOrderTicketsContext()
  const { drinkAtTopping, updateDrink, submitDrinkWithOrder, clearToppingCup } = useDrinkProgress()
  const toppingCup = drinkAtTopping?.cupVisual ?? null
  const selectedCream = drinkAtTopping?.recipe.creamTop
    ? CREAM_RECIPE_TO_UI[drinkAtTopping.recipe.creamTop] ?? null
    : null
  const selectedPowder = drinkAtTopping?.recipe.powder
    ? POWDER_RECIPE_TO_UI[drinkAtTopping.recipe.powder] ?? null
    : null
  const [cupShooting, setCupShooting] = useState(false)
  const cupSendFinishedRef = useRef(false)
  const [animatingCream, setAnimatingCream] = useState<CreamOption | null>(null)
  const [animatingPowder, setAnimatingPowder] = useState<PowderOption | null>(null)
  const pendingTimeoutsRef = useRef<number[]>([])
  const CREAM_ANIMATION_MS = 1500
  const CREAM_PREVIEW_UPDATE_MS = 1200
  const POWDER_ANIMATION_MS = 1800
  const POWDER_PREVIEW_UPDATE_MS = 1450
  const isAnimating = Boolean(animatingCream || animatingPowder)
  const showReadyButton = Boolean(drinkAtTopping && toppingCup) && !cupShooting

  function finishSendCupFromTopping() {
    if (cupSendFinishedRef.current) return
    cupSendFinishedRef.current = true

    const ticket = ticketStore.mainTicket
    if (drinkAtTopping) {
      if (ticket) {
        submitDrinkWithOrder(ticket)
        beginNewOrder()
      } else {
        clearToppingCup()
      }
    }

    clearPendingTimeouts()
    setAnimatingCream(null)
    setAnimatingPowder(null)
    setCupShooting(false)
  }

  function handleReadyClick() {
    if (!drinkAtTopping || !toppingCup || cupShooting) return
    cupSendFinishedRef.current = false
    setCupShooting(true)
    trackTimeout(() => {
      finishSendCupFromTopping()
    }, CUP_SHOOT_MS)
  }

  function handleCupShootAnimationEnd() {
    if (!cupShooting) return
    finishSendCupFromTopping()
  }

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

  function handleCreamClick(cream: CreamOption) {
    if (!drinkAtTopping || !toppingCup || isAnimating || selectedCream || selectedPowder) return
    setAnimatingCream(cream)
    trackTimeout(() => {
      updateDrink(drinkAtTopping.id, { recipe: { creamTop: CREAM_UI_TO_RECIPE[cream] } })
    }, CREAM_PREVIEW_UPDATE_MS)
    trackTimeout(() => {
      setAnimatingCream(null)
    }, CREAM_ANIMATION_MS)
  }

  function handlePowderClick(powder: PowderOption) {
    if (!drinkAtTopping || !toppingCup || isAnimating || selectedPowder) return
    setAnimatingPowder(powder)
    trackTimeout(() => {
      updateDrink(drinkAtTopping.id, { recipe: { powder: POWDER_UI_TO_RECIPE[powder] } })
    }, POWDER_PREVIEW_UPDATE_MS)
    trackTimeout(() => {
      setAnimatingPowder(null)
    }, POWDER_ANIMATION_MS)
  }

  function getDrinkPreviewImage() {
    if (!toppingCup) return ''

    const drinkSize = toppingCup.size

    if (selectedCream && selectedPowder) {
      const comboPowderFolder = COMBO_POWDER_FOLDER_BY_OPTION[selectedPowder]
      const comboPath = `../assets/topping/drinks_with_cream_and_${comboPowderFolder}/${drinkSize}_${selectedCream}_cream_${comboPowderFolder}.png`
      return COMBO_DRINK_IMAGE_BY_PATH[comboPath] ?? CREAM_DRINK_IMAGES[drinkSize][selectedCream]
    }

    if (selectedCream) {
      return CREAM_DRINK_IMAGES[drinkSize][selectedCream]
    }

    if (selectedPowder) {
      return POWDER_DRINK_IMAGES[drinkSize][selectedPowder]
    }

    return getCupPreviewSrc(toppingCup)
  }

  const toppingInteractCursor = toppingCup && !isAnimating && !cupShooting ? 'pointer' : 'default'

  return (
    <main className="station-page" aria-label="Topping station page">
      <section className="station-stage">
        <img className="station-background" src={stationTable} alt="" draggable="false" />
        <OrderTicketBoard
          ticketStore={ticketStore}
          showOrderTicketText={showOrderTicketText}
          revealedOrderLineCount={revealedOrderLineCount}
          onHistoryTicketClick={swapMainWithHistory}
        />
        <div className="topping-label topping-label-matcha">Matcha</div>
        <div className="topping-label topping-label-vanilla">Vanilla</div>
        <div className="topping-label topping-label-ube">Ube</div>
        <div className="topping-label topping-label-yuzu">Yuzu</div>
        <img
          className={`topping-cream topping-cream-matcha ${
            selectedCream === 'matcha' ? 'is-selected' : ''
          } ${animatingCream === 'matcha' ? 'is-animating' : ''}`}
          src={creamMatcha}
          alt=""
          draggable="false"
          onClick={() => handleCreamClick('matcha')}
          style={{ cursor: toppingInteractCursor, pointerEvents: 'auto' }}
        />
        <img
          className={`topping-cream topping-cream-vanilla ${
            selectedCream === 'vanilla' ? 'is-selected' : ''
          } ${animatingCream === 'vanilla' ? 'is-animating' : ''}`}
          src={creamVanilla}
          alt=""
          draggable="false"
          onClick={() => handleCreamClick('vanilla')}
          style={{ cursor: toppingInteractCursor, pointerEvents: 'auto' }}
        />
        <img
          className={`topping-cream topping-cream-ube ${
            selectedCream === 'ube' ? 'is-selected' : ''
          } ${animatingCream === 'ube' ? 'is-animating' : ''}`}
          src={creamUbe}
          alt=""
          draggable="false"
          onClick={() => handleCreamClick('ube')}
          style={{ cursor: toppingInteractCursor, pointerEvents: 'auto' }}
        />
        <img
          className={`topping-cream topping-cream-yuzu ${
            selectedCream === 'yuzu' ? 'is-selected' : ''
          } ${animatingCream === 'yuzu' ? 'is-animating' : ''}`}
          src={creamYuzu}
          alt=""
          draggable="false"
          onClick={() => handleCreamClick('yuzu')}
          style={{ cursor: toppingInteractCursor, pointerEvents: 'auto' }}
        />

        <img
          className={`topping-powder topping-powder-black-sesame ${
            selectedPowder === 'black-sesame' ? 'is-selected' : ''
          } ${animatingPowder === 'black-sesame' ? 'is-animating' : ''}`}
          src={powderJar}
          alt=""
          draggable="false"
          onClick={() => handlePowderClick('black-sesame')}
          style={{ cursor: toppingInteractCursor, pointerEvents: 'auto' }}
        />
        <img
          className={`topping-powder topping-powder-hojicha ${
            selectedPowder === 'hojicha' ? 'is-selected' : ''
          } ${animatingPowder === 'hojicha' ? 'is-animating' : ''}`}
          src={powderJar}
          alt=""
          draggable="false"
          onClick={() => handlePowderClick('hojicha')}
          style={{ cursor: toppingInteractCursor, pointerEvents: 'auto' }}
        />
        <img
          className={`topping-powder topping-powder-kinako ${
            selectedPowder === 'kinako' ? 'is-selected' : ''
          } ${animatingPowder === 'kinako' ? 'is-animating' : ''}`}
          src={powderJar}
          alt=""
          draggable="false"
          onClick={() => handlePowderClick('kinako')}
          style={{ cursor: toppingInteractCursor, pointerEvents: 'auto' }}
        />
        <img
          className={`topping-powder topping-powder-matcha ${
            selectedPowder === 'matcha' ? 'is-selected' : ''
          } ${animatingPowder === 'matcha' ? 'is-animating' : ''}`}
          src={powderJar}
          alt=""
          draggable="false"
          onClick={() => handlePowderClick('matcha')}
          style={{ cursor: toppingInteractCursor, pointerEvents: 'auto' }}
        />
        <div className="topping-label topping-label-black-sesame">Black Sesame</div>
        <div className="topping-label topping-label-hojicha">Hojicha</div>
        <div className="topping-label topping-label-kinako">Kinako</div>
        <div className="topping-label topping-label-matcha-powder">Matcha Powder</div>
        {toppingCup && (
          <img
            className={`topping-base-drink topping-base-drink--${toppingCup.size}${cupShooting ? ' is-shooting' : ''}`}
            src={getDrinkPreviewImage()}
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
        <StationDock currentStation="topping" />
      </section>
    </main>
  )
}

export default ToppingStationPage
