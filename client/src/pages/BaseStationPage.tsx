import stationTable from '../assets/station-shared/station-table.png'
import StationDock from '../components/StationDock'
import './StationPage.css'

function BaseStationPage() {
  return (
    <main className="station-page" aria-label="Base station page">
      <section className="station-stage">
        <img className="station-background" src={stationTable} alt="" draggable="false" />
        <StationDock currentStation="base" />
      </section>
    </main>
  )
}

export default BaseStationPage
