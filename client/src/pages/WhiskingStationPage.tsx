import stationTable from '../assets/station-shared/station-table.png'
import OrderTicketBoard from '../components/OrderTicketBoard'
import StationDock from '../components/StationDock'
import { useOrderTicketsContext } from '../OrderTicketsContext'
import emptyBowl from '../assets/whisking-station/empty-bowl.png'
import whisk from '../assets/whisking-station/whisk.png'
import emptySpoon from '../assets/whisking-station/empty-spoon.png'
import kettle from '../assets/whisking-station/kettle.png'
import matchaScale from '../assets/whisking-station/matcha-scale.png'
import matchaTin from '../assets/whisking-station/matcha-tin.png'
import './StationPage.css'

function WhiskingStationPage() {
  const { ticketStore, showOrderTicketText, revealedOrderLineCount, swapMainWithHistory } =
    useOrderTicketsContext()

  return (
    <main className="station-page" aria-label="Whisking station page">
      <section className="station-stage">
        <img className="station-background" src={stationTable} alt="" draggable="false" />
        <OrderTicketBoard
          ticketStore={ticketStore}
          showOrderTicketText={showOrderTicketText}
          revealedOrderLineCount={revealedOrderLineCount}
          onHistoryTicketClick={swapMainWithHistory}
        />
        <img className="matcha-scale" src={matchaScale} alt="" draggable="false" />
        <img className="whisking-empty-bowl" src={emptyBowl} alt="" draggable="false" />
        <img className="whisking-whisk" src={whisk} alt="" draggable="false" />
        <img className="whisking-empty-spoon" src={emptySpoon} alt="" draggable="false" />
        <img className="whisking-kettle" src={kettle} alt="" draggable="false" />
        <img className="whisking-matcha-tin" src={matchaTin} alt="" draggable="false" />
        <StationDock currentStation="whisking" />
      </section>
    </main>
  )
}

export default WhiskingStationPage
