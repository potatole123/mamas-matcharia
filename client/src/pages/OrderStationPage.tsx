import matchaInterior from '../assets/order/matcha-interior.png'
import bearista from '../assets/order/bearista-cropped.png'
import bearSmile from '../assets/order/bear-smile-cropped.png'
import speechBubble from '../assets/order/speech-bubble.png'
import StationDock from '../components/StationDock'
import orderTicket from '../assets/station-shared/order-ticket.png'
import './StationPage.css'

function OrderStationPage() {
  return (
    <main className="station-page order-station-page" aria-label="Order station page">
      <section className="station-stage">
        <img className="station-background" src={matchaInterior} alt="" draggable="false" />
        <img className="order-bearista" src={bearista} alt="" draggable="false" />
        <img className="order-speech-bubble" src={speechBubble} alt="" draggable="false" />
        <img className="order-bear-smile" src={bearSmile} alt="" draggable="false" />
        <img className="station-order-ticket" src={orderTicket} alt="" draggable="false" />
        <StationDock currentStation="order" />
      </section>
    </main>
  )
}

export default OrderStationPage
