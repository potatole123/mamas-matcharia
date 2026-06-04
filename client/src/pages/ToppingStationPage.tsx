import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import stationTable from '../assets/station-shared/station-table.png'
import OrderTicketBoard from '../components/OrderTicketBoard'
import StationDock from '../components/StationDock'
import readyButton from '../assets/ready_button.png'
import { useDrinkProgress } from '../DrinkProgressContext'
import { getCupPreviewSrc, type BaseCupSnapshot } from '../drinkCup'
import { useGameDayContext } from '../GameDayContext'
import { useOrderTicketsContext } from '../OrderTicketsContext'
import { useTutorialContext, type ToppingStationTutorialStep } from '../TutorialContext'
import { isFreePlayMode, isTutorialGameplayMode } from '../utils/gameMode'
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

type DepartingToppingCup = {
  cup: BaseCupSnapshot
  cream: CreamOption | null
  powder: PowderOption | null
}

function getToppingTutorialMessage(
  step: Exclude<ToppingStationTutorialStep, 'complete'>,
  recipe: { creamTop?: string; powder?: string } | null,
) {
  switch (step) {
    case 'review-cream-top':
      return recipe?.creamTop && recipe.creamTop !== 'none'
        ? 'These are cream tops. Check the order ticket, then click the matching cream top.'
        : 'These are cream tops. This order says None, so leave them alone for now.'
    case 'review-powder':
      return recipe?.powder && recipe.powder !== 'none'
        ? 'These are powders. Check the order ticket, then click the matching powder.'
        : 'These are powders. This order says None, so skip them for now.'
    case 'send-to-customer':
      return 'Click the Ready button to send the drink off to the customer.'
  }
}

function ToppingStationPage() {
  const navigate = useNavigate()
  const {
    ticketStore,
    showOrderTicketText,
    revealedOrderLineCount,
    swapMainWithHistory,
    consumeTicket,
  } = useOrderTicketsContext()
  const { dayState } = useGameDayContext()
  const { toppingStationStep, setToppingStationStep } = useTutorialContext()
  const { drinkAtTopping, updateDrink, submitDrinkWithOrder, finishFreePlayDrink } = useDrinkProgress()
  const toppingCup = drinkAtTopping?.cupVisual ?? null
  const selectedCream = drinkAtTopping?.recipe.creamTop
    ? CREAM_RECIPE_TO_UI[drinkAtTopping.recipe.creamTop] ?? null
    : null
  const selectedPowder = drinkAtTopping?.recipe.powder
    ? POWDER_RECIPE_TO_UI[drinkAtTopping.recipe.powder] ?? null
    : null
  const [cupShooting, setCupShooting] = useState(false)
  const [departingServe, setDepartingServe] = useState<DepartingToppingCup | null>(null)
  const [animatingCream, setAnimatingCream] = useState<CreamOption | null>(null)
  const [animatingPowder, setAnimatingPowder] = useState<PowderOption | null>(null)
  const pendingTimeoutsRef = useRef<number[]>([])
  const tutorialStepRef = useRef<ToppingStationTutorialStep | null>(toppingStationStep)
  const CREAM_ANIMATION_MS = 1500
  const CREAM_PREVIEW_UPDATE_MS = 1200
  const POWDER_ANIMATION_MS = 1800
  const POWDER_PREVIEW_UPDATE_MS = 1450
  const isAnimating = Boolean(animatingCream || animatingPowder)
  const isFreePlay = isFreePlayMode(dayState?.day)
  const showReadyButton =
    Boolean(drinkAtTopping && toppingCup && (isFreePlay || ticketStore.mainTicket)) && !cupShooting
  const activeTutorialStep = isTutorialGameplayMode(dayState?.day) ? toppingStationStep : null
  const activeRecipe = ticketStore.mainTicket?.recipe ?? null
  const tutorialMessage =
    activeTutorialStep && activeTutorialStep !== 'complete'
      ? getToppingTutorialMessage(activeTutorialStep, activeRecipe)
      : null
  const shouldShowTutorialContinue =
    (activeTutorialStep === 'review-cream-top' && activeRecipe?.creamTop === 'none') ||
    (activeTutorialStep === 'review-powder' && activeRecipe?.powder === 'none')
  const isStationDockLocked = Boolean(
    activeTutorialStep && activeTutorialStep !== 'complete',
  )

  const cupOnStage = toppingCup ?? departingServe?.cup ?? null
  const previewCream = selectedCream ?? departingServe?.cream ?? null
  const previewPowder = selectedPowder ?? departingServe?.powder ?? null

  function handleReadyClick() {
    if (!drinkAtTopping || !toppingCup || cupShooting) return

    if (isFreePlay) {
      setDepartingServe({
        cup: toppingCup,
        cream: selectedCream,
        powder: selectedPowder,
      })
      clearPendingTimeouts()
      setAnimatingCream(null)
      setAnimatingPowder(null)
      setCupShooting(true)
      return
    }

    const ticket = ticketStore.mainTicket
    if (!ticket) return

    setDepartingServe({
      cup: toppingCup,
      cream: selectedCream,
      powder: selectedPowder,
    })

    submitDrinkWithOrder(ticket)
    consumeTicket(ticket.orderId)

    clearPendingTimeouts()
    setAnimatingCream(null)
    setAnimatingPowder(null)
    setCupShooting(true)
    if (tutorialStepRef.current === 'send-to-customer') {
      setToppingStationStep('complete')
    }
  }

  function handleCupShootAnimationEnd() {
    if (!cupShooting) return
    setCupShooting(false)
    setDepartingServe(null)

    if (isFreePlay) {
      finishFreePlayDrink()
      return
    }

    navigate('/serve-customer')
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

  useEffect(() => {
    tutorialStepRef.current = activeTutorialStep
  }, [activeTutorialStep])

  function handleCreamClick(cream: CreamOption) {
    if (!drinkAtTopping || !toppingCup || isAnimating || selectedCream || selectedPowder) return
    if (activeTutorialStep && activeTutorialStep !== 'complete') {
      if (
        activeTutorialStep !== 'review-cream-top' ||
        activeRecipe?.creamTop === 'none' ||
        (activeRecipe?.creamTop && CREAM_RECIPE_TO_UI[activeRecipe.creamTop] !== cream)
      ) {
        return
      }
    }

    setAnimatingCream(cream)
    trackTimeout(() => {
      updateDrink(drinkAtTopping.id, { recipe: { creamTop: CREAM_UI_TO_RECIPE[cream] } })
      if (tutorialStepRef.current === 'review-cream-top') {
        setToppingStationStep('review-powder')
      }
    }, CREAM_PREVIEW_UPDATE_MS)
    trackTimeout(() => {
      setAnimatingCream(null)
    }, CREAM_ANIMATION_MS)
  }

  function handlePowderClick(powder: PowderOption) {
    if (!drinkAtTopping || !toppingCup || isAnimating || selectedPowder) return
    if (activeTutorialStep && activeTutorialStep !== 'complete') {
      if (
        activeTutorialStep !== 'review-powder' ||
        activeRecipe?.powder === 'none' ||
        (activeRecipe?.powder && POWDER_RECIPE_TO_UI[activeRecipe.powder] !== powder)
      ) {
        return
      }
    }

    setAnimatingPowder(powder)
    trackTimeout(() => {
      updateDrink(drinkAtTopping.id, { recipe: { powder: POWDER_UI_TO_RECIPE[powder] } })
      if (tutorialStepRef.current === 'review-powder') {
        setToppingStationStep('send-to-customer')
      }
    }, POWDER_PREVIEW_UPDATE_MS)
    trackTimeout(() => {
      setAnimatingPowder(null)
    }, POWDER_ANIMATION_MS)
  }

  function getDrinkPreviewImage() {
    if (!cupOnStage) return ''

    const drinkSize = cupOnStage.size

    if (previewCream && previewPowder) {
      const comboPowderFolder = COMBO_POWDER_FOLDER_BY_OPTION[previewPowder]
      const comboPath = `../assets/topping/drinks_with_cream_and_${comboPowderFolder}/${drinkSize}_${previewCream}_cream_${comboPowderFolder}.png`
      return COMBO_DRINK_IMAGE_BY_PATH[comboPath] ?? CREAM_DRINK_IMAGES[drinkSize][previewCream]
    }

    if (previewCream) {
      return CREAM_DRINK_IMAGES[drinkSize][previewCream]
    }

    if (previewPowder) {
      return POWDER_DRINK_IMAGES[drinkSize][previewPowder]
    }

    return getCupPreviewSrc(cupOnStage)
  }

  const toppingInteractCursor = drinkAtTopping && toppingCup && !isAnimating && !cupShooting
    ? 'pointer'
    : 'default'

  function getCreamClassName(cream: CreamOption) {
    const shouldHighlight = activeTutorialStep === 'review-cream-top'

    return `topping-cream topping-cream-${cream} ${
      selectedCream === cream ? 'is-selected' : ''
    } ${animatingCream === cream ? 'is-animating' : ''}${
      shouldHighlight ? ' is-tutorial-highlight' : ''
    }`
  }

  function getPowderClassName(powder: PowderOption) {
    const shouldHighlight = activeTutorialStep === 'review-powder'

    return `topping-powder topping-powder-${powder} ${
      selectedPowder === powder ? 'is-selected' : ''
    } ${animatingPowder === powder ? 'is-animating' : ''}${
      shouldHighlight ? ' is-tutorial-highlight' : ''
    }`
  }

  function handleStageClick(event: MouseEvent<HTMLElement>) {
    const clickedElement = event.target as Element
    if (
      clickedElement.closest('.station-dock') ||
      clickedElement.closest('.station-exit-button') ||
      clickedElement.closest('button')
    ) {
      return
    }

    if (activeTutorialStep === 'review-cream-top' && activeRecipe?.creamTop === 'none') {
      setToppingStationStep('review-powder')
      return
    }

    if (activeTutorialStep === 'review-powder' && activeRecipe?.powder === 'none') {
      setToppingStationStep('send-to-customer')
    }
  }

  return (
    <main className="station-page" aria-label="Topping station page" onClick={handleStageClick}>
      <section className="station-stage">
        <img className="station-background" src={stationTable} alt="" draggable="false" />
        {!isFreePlay && (
          <OrderTicketBoard
            ticketStore={ticketStore}
            showOrderTicketText={showOrderTicketText}
            revealedOrderLineCount={revealedOrderLineCount}
            onHistoryTicketClick={swapMainWithHistory}
            disabled={isStationDockLocked}
          />
        )}
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
        <div className="topping-label topping-label-matcha">Matcha</div>
        <div className="topping-label topping-label-vanilla">Vanilla</div>
        <div className="topping-label topping-label-ube">Ube</div>
        <div className="topping-label topping-label-yuzu">Yuzu</div>
        <img
          className={getCreamClassName('matcha')}
          src={creamMatcha}
          alt=""
          draggable="false"
          onClick={() => handleCreamClick('matcha')}
          style={{ cursor: toppingInteractCursor, pointerEvents: 'auto' }}
        />
        <img
          className={getCreamClassName('vanilla')}
          src={creamVanilla}
          alt=""
          draggable="false"
          onClick={() => handleCreamClick('vanilla')}
          style={{ cursor: toppingInteractCursor, pointerEvents: 'auto' }}
        />
        <img
          className={getCreamClassName('ube')}
          src={creamUbe}
          alt=""
          draggable="false"
          onClick={() => handleCreamClick('ube')}
          style={{ cursor: toppingInteractCursor, pointerEvents: 'auto' }}
        />
        <img
          className={getCreamClassName('yuzu')}
          src={creamYuzu}
          alt=""
          draggable="false"
          onClick={() => handleCreamClick('yuzu')}
          style={{ cursor: toppingInteractCursor, pointerEvents: 'auto' }}
        />

        <img
          className={getPowderClassName('black-sesame')}
          src={powderJar}
          alt=""
          draggable="false"
          onClick={() => handlePowderClick('black-sesame')}
          style={{ cursor: toppingInteractCursor, pointerEvents: 'auto' }}
        />
        <img
          className={getPowderClassName('hojicha')}
          src={powderJar}
          alt=""
          draggable="false"
          onClick={() => handlePowderClick('hojicha')}
          style={{ cursor: toppingInteractCursor, pointerEvents: 'auto' }}
        />
        <img
          className={getPowderClassName('kinako')}
          src={powderJar}
          alt=""
          draggable="false"
          onClick={() => handlePowderClick('kinako')}
          style={{ cursor: toppingInteractCursor, pointerEvents: 'auto' }}
        />
        <img
          className={getPowderClassName('matcha')}
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
        {cupOnStage && (
          <img
            className={`topping-base-drink topping-base-drink--${cupOnStage.size}${cupShooting ? ' is-shooting' : ''}`}
            src={getDrinkPreviewImage()}
            alt=""
            draggable="false"
            onAnimationEnd={handleCupShootAnimationEnd}
          />
        )}
        {showReadyButton && (
          <button
            type="button"
            className={`station-ready-button${
              activeTutorialStep === 'send-to-customer' ? ' is-tutorial-highlight' : ''
            }`}
            aria-label="Ready"
            onClick={handleReadyClick}
          >
            <img src={readyButton} alt="" draggable={false} />
          </button>
        )}
        <StationDock currentStation="topping" disabled={isStationDockLocked} />
      </section>
    </main>
  )
}

export default ToppingStationPage
