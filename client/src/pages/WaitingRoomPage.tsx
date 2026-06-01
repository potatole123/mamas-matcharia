import { useState } from 'react'
import stationTable from '../assets/station-shared/station-table.png'
import './StationPage.css'

// need to add a popup to enter join code
// direct to join waiting room of that game
function WaitingRoomPage() {
  const [playerCount] = useState<number | null>(null)
  return (
    <main className="station-page" aria-label="Waiting room page">
      <section className="station-stage">
        <img className="station-background" src={stationTable} alt="" draggable="false" />
        <p className="waiting-room-count">
            {playerCount == null
                ? 'Waiting for players...'
                : `Waiting for ${playerCount} players...`
            }
        </p>
      </section>
    </main>
  )
}

export default WaitingRoomPage
