import matchaInterior from '../assets/order/matcha-interior.png'
import './OrderStationPage.css'

function OrderStationPage() {
  return (
    <main className="order-station-page" aria-label="Order station page">
      <img
        className="order-station-background"
        src={matchaInterior}
        alt=""
        draggable="false"
      />
    </main>
  )
}

export default OrderStationPage
