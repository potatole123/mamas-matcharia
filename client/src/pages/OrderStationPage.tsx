import matchaInterior from '../assets/order/matcha-interior.png'
import StationDock from '../components/StationDock'
import './StationPage.css'

function OrderStationPage() {
  return (
    <main className="station-page" aria-label="Order station page">
      <section className="station-stage">
        <img className="station-background" src={matchaInterior} alt="" draggable="false" />
        <StationDock currentStation="order" />
      </section>
    </main>
  )
}

export default OrderStationPage
