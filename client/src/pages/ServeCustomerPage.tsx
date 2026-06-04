import { useEffect, useState } from 'react'
import matchaInterior from '../assets/order/matcha-interior.png'
import bearSmile from '../assets/order/bear-smile.png'
import bearOpen from '../assets/order/bear-open.png'
import bearista from '../assets/order/bearista-cropped.png'
import drinkLarge from '../assets/order/drink-large.png'
import drinkSmall from '../assets/order/drink-small.png'
import orderCounter from '../assets/order/order-counter.png'
import { useDrinkProgress } from '../DrinkProgressContext'
import './StationPage.css'

const SERVE_TASTE_START_DELAY_MS = 1000
const SERVE_TASTE_MOVE_MS = 800
const SERVE_TASTE_PAUSE_MS = 1000

function ServeCustomerPage() {
  const { lastOrderSubmission } = useDrinkProgress()
  const servedDrinkSize = lastOrderSubmission?.drink.cupVisual.size ?? null
  const servedDrinkImage =
    servedDrinkSize === 'large' ? drinkLarge : servedDrinkSize === 'small' ? drinkSmall : null
  const [isBearTasting, setIsBearTasting] = useState(false)

  useEffect(() => {
    if (!servedDrinkSize) {
      return
    }

    const openMouthTimeoutId = window.setTimeout(
      () => setIsBearTasting(true),
      SERVE_TASTE_START_DELAY_MS + SERVE_TASTE_MOVE_MS,
    )
    const smileTimeoutId = window.setTimeout(
      () => setIsBearTasting(false),
      SERVE_TASTE_START_DELAY_MS + SERVE_TASTE_MOVE_MS + SERVE_TASTE_PAUSE_MS,
    )

    return () => {
      window.clearTimeout(openMouthTimeoutId)
      window.clearTimeout(smileTimeoutId)
    }
  }, [lastOrderSubmission?.drinkId, servedDrinkSize])

  return (
    <main className="station-page serve-customer-page" aria-label="Serve customer page">
      <section className="station-stage">
        <img className="station-background" src={matchaInterior} alt="" draggable="false" />
        <img
          className="serve-customer-bear"
          src={isBearTasting ? bearOpen : bearSmile}
          alt=""
          draggable="false"
        />
        {servedDrinkImage && (
          <img
            key={lastOrderSubmission?.drinkId}
            className={`serve-customer-drink serve-customer-drink--${servedDrinkSize} is-tasting`}
            src={servedDrinkImage}
            alt=""
            draggable="false"
          />
        )}
        <img className="serve-customer-counter" src={orderCounter} alt="" draggable="false" />
        <img className="serve-customer-bearista" src={bearista} alt="" draggable="false" />
      </section>
    </main>
  )
}

export default ServeCustomerPage
