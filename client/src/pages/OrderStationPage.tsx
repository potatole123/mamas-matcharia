import { useEffect, useState } from 'react'
import matchaInterior from '../assets/order/matcha-interior.png'
import bearista from '../assets/order/bearista-cropped.png'
import bearSmile from '../assets/order/bear-smile-cropped.png'
import bearLaugh from '../assets/order/bear-laugh-cropped.png'
import bearOpen from '../assets/order/bear-open-cropped.png'
import speechBubble from '../assets/order/speech-bubble.png'
import StationDock from '../components/StationDock'
import orderTicket from '../assets/station-shared/order-ticket.png'
import './StationPage.css'

function OrderStationPage() {
  const bearExpressions = [bearSmile, bearLaugh, bearSmile, bearOpen]
  const [bearExpressionIndex, setBearExpressionIndex] = useState(0)

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setBearExpressionIndex((currentIndex) => (currentIndex + 1) % bearExpressions.length)
    }, 200)

    return () => window.clearInterval(timerId)
  }, [bearExpressions.length])

  return (
    <main className="station-page order-station-page" aria-label="Order station page">
      <section className="station-stage">
        <img className="station-background" src={matchaInterior} alt="" draggable="false" />
        <img className="order-bearista" src={bearista} alt="" draggable="false" />
        <img className="order-speech-bubble" src={speechBubble} alt="" draggable="false" />
        <img
          className="order-bear-customer"
          src={bearExpressions[bearExpressionIndex]}
          alt=""
          draggable="false"
        />
        <img className="station-order-ticket" src={orderTicket} alt="" draggable="false" />
        <StationDock currentStation="order" />
      </section>
    </main>
  )
}

export default OrderStationPage
