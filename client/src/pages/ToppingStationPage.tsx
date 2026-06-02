import { useEffect, useRef, useState } from 'react'
import stationTable from '../assets/station-shared/station-table.png'
import OrderTicketBoard from '../components/OrderTicketBoard'
import StationDock from '../components/StationDock'
import { useOrderTicketsContext } from '../OrderTicketsContext'
import creamMatcha from '../assets/topping/matcha_cream.png'
import creamVanilla from '../assets/topping/vanilla_cream.png'
import creamUbe from '../assets/topping/ube_cream.png'
import creamYuzu from '../assets/topping/yuzu_cream.png'
import powderJar from '../assets/topping/powder.png'
import smallBaseDrink from '../assets/topping/base_drink/small_base.png'
import largeBaseDrink from '../assets/topping/base_drink/large_base.png'
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

type PowderOption = 'black-sesame' | 'hojicha' | 'kinako' | 'matcha'
type CreamOption = 'matcha' | 'vanilla' | 'ube' | 'yuzu'
type DrinkSize = 'small' | 'large'
type ComboPowderFolder = 'black_sesame' | 'hojicha' | 'kinako' | 'matcha_powder'

const BASE_DRINK_IMAGES: Record<DrinkSize, string> = {
  small: smallBaseDrink,
  large: largeBaseDrink,
}

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

function ToppingStationPage() {
  const { ticketStore, showOrderTicketText, revealedOrderLineCount, swapMainWithHistory } =
    useOrderTicketsContext()
  const [drinkSize, setDrinkSize] = useState<DrinkSize>('small')
  const [selectedCream, setSelectedCream] = useState<CreamOption | null>(null)
  const [animatingCream, setAnimatingCream] = useState<CreamOption | null>(null)
  const [selectedPowder, setSelectedPowder] = useState<PowderOption | null>(null)
  const [animatingPowder, setAnimatingPowder] = useState<PowderOption | null>(null)
  const pendingTimeoutsRef = useRef<number[]>([])
  const CREAM_ANIMATION_MS = 1500
  const CREAM_PREVIEW_UPDATE_MS = 1200
  const POWDER_ANIMATION_MS = 1800
  const POWDER_PREVIEW_UPDATE_MS = 1450
  const isAnimating = Boolean(animatingCream || animatingPowder)

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

  function resetToppings() {
    clearPendingTimeouts()
    setSelectedCream(null)
    setSelectedPowder(null)
    setAnimatingCream(null)
    setAnimatingPowder(null)
  }

  function handleCreamClick(cream: CreamOption) {
    if (isAnimating || selectedCream || selectedPowder) return
    setAnimatingCream(cream)
    trackTimeout(() => {
      setSelectedCream(cream)
    }, CREAM_PREVIEW_UPDATE_MS)
    trackTimeout(() => {
      setAnimatingCream(null)
    }, CREAM_ANIMATION_MS)
  }

  function handlePowderClick(powder: PowderOption) {
    if (isAnimating || selectedPowder) return
    setAnimatingPowder(powder)
    trackTimeout(() => {
      setSelectedPowder(powder)
    }, POWDER_PREVIEW_UPDATE_MS)
    trackTimeout(() => {
      setAnimatingPowder(null)
    }, POWDER_ANIMATION_MS)
  }

  function getDrinkPreviewImage() {
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

    return BASE_DRINK_IMAGES[drinkSize]
  }

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
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        />
        <img
          className={`topping-cream topping-cream-vanilla ${
            selectedCream === 'vanilla' ? 'is-selected' : ''
          } ${animatingCream === 'vanilla' ? 'is-animating' : ''}`}
          src={creamVanilla}
          alt=""
          draggable="false"
          onClick={() => handleCreamClick('vanilla')}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        />
        <img
          className={`topping-cream topping-cream-ube ${
            selectedCream === 'ube' ? 'is-selected' : ''
          } ${animatingCream === 'ube' ? 'is-animating' : ''}`}
          src={creamUbe}
          alt=""
          draggable="false"
          onClick={() => handleCreamClick('ube')}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        />
        <img
          className={`topping-cream topping-cream-yuzu ${
            selectedCream === 'yuzu' ? 'is-selected' : ''
          } ${animatingCream === 'yuzu' ? 'is-animating' : ''}`}
          src={creamYuzu}
          alt=""
          draggable="false"
          onClick={() => handleCreamClick('yuzu')}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        />

        <img
          className={`topping-powder topping-powder-black-sesame ${
            selectedPowder === 'black-sesame' ? 'is-selected' : ''
          } ${animatingPowder === 'black-sesame' ? 'is-animating' : ''}`}
          src={powderJar}
          alt=""
          draggable="false"
          onClick={() => handlePowderClick('black-sesame')}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        />
        <img
          className={`topping-powder topping-powder-hojicha ${
            selectedPowder === 'hojicha' ? 'is-selected' : ''
          } ${animatingPowder === 'hojicha' ? 'is-animating' : ''}`}
          src={powderJar}
          alt=""
          draggable="false"
          onClick={() => handlePowderClick('hojicha')}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        />
        <img
          className={`topping-powder topping-powder-kinako ${
            selectedPowder === 'kinako' ? 'is-selected' : ''
          } ${animatingPowder === 'kinako' ? 'is-animating' : ''}`}
          src={powderJar}
          alt=""
          draggable="false"
          onClick={() => handlePowderClick('kinako')}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        />
        <img
          className={`topping-powder topping-powder-matcha ${
            selectedPowder === 'matcha' ? 'is-selected' : ''
          } ${animatingPowder === 'matcha' ? 'is-animating' : ''}`}
          src={powderJar}
          alt=""
          draggable="false"
          onClick={() => handlePowderClick('matcha')}
          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        />
        <div className="topping-label topping-label-black-sesame">Black Sesame</div>
        <div className="topping-label topping-label-hojicha">Hojicha</div>
        <div className="topping-label topping-label-kinako">Kinako</div>
        <div className="topping-label topping-label-matcha-powder">Matcha Powder</div>
        <img
          className="topping-base-drink"
          src={getDrinkPreviewImage()}
          alt=""
          draggable="false"
        />
        <div className="topping-size-toggle">
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
          <button type="button" onClick={resetToppings}>
            Reset
          </button>
        </div>
        <StationDock currentStation="topping" />
      </section>
    </main>
  )
}

export default ToppingStationPage
