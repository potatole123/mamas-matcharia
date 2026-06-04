import { useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Fetch } from '../Fetch'
import { useAuth } from '../auth'
import { useDrinkProgress } from '../DrinkProgressContext'
import { useGameDayContext } from '../GameDayContext'
import { useOrderTicketsContext } from '../OrderTicketsContext'
import exitButton from '../assets/station-shared/exit-button.png'
import orderButton from '../assets/station-shared/order-button.png'
import baseButton from '../assets/station-shared/base-button.png'
import whiskingButton from '../assets/station-shared/whisking-button.png'
import toppingButton from '../assets/station-shared/topping-button.png'
import './StationDock.css'

type StationKey = 'order' | 'base' | 'whisking' | 'topping'

type StationDockProps = {
  currentStation: StationKey
  disabled?: boolean
}

const stationButtons: Array<{
  key: StationKey
  label: string
  imageSrc: string
  path: string
}> = [
  { key: 'order', label: 'Order station', imageSrc: orderButton, path: '/order-station' },
  { key: 'base', label: 'Base station', imageSrc: baseButton, path: '/base-station' },
  {
    key: 'whisking',
    label: 'Whisking station',
    imageSrc: whiskingButton,
    path: '/whisking-station',
  },
  {
    key: 'topping',
    label: 'Topping station',
    imageSrc: toppingButton,
    path: '/topping-station',
  },
]

function StationDock({ currentStation, disabled = false }: StationDockProps) {
  const navigate = useNavigate()
  const { getIdToken } = useAuth()
  const { resetDay } = useGameDayContext()
  const { resetOrderTickets } = useOrderTicketsContext()
  const { resetAllStationProgress } = useDrinkProgress()
  const [isExiting, setIsExiting] = useState(false)

  async function handleExitClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()

    if (isExiting) {
      return
    }

    setIsExiting(true)
    try {
      const token = await getIdToken()
      if (!token) {
        throw new Error('Authentication token is unavailable')
      }

      await Fetch<null>('/api/session', {
        method: 'DELETE',
        token,
      })
      resetDay()
      resetOrderTickets()
      resetAllStationProgress()
      navigate('/home', { replace: true })
    } catch (error) {
      console.error('Could not exit game session', error)
      setIsExiting(false)
    }
  }

  return (
    <>
      <button
        className="station-exit-button"
        type="button"
        aria-label="Exit game"
        disabled={isExiting}
        onClick={handleExitClick}
      >
        <img src={exitButton} alt="" draggable="false" />
      </button>
      <nav className="station-dock" aria-label="Station navigation">
        {stationButtons.map((station) => {
          const isActive = station.key === currentStation

          return (
            <button
              key={station.key}
              className={`station-dock-button ${isActive ? 'is-active' : ''}`}
              type="button"
              aria-label={station.label}
              aria-current={isActive ? 'page' : undefined}
              disabled={disabled}
              onClick={() => navigate(station.path)}
            >
              <img src={station.imageSrc} alt="" draggable="false" />
            </button>
          )
        })}
      </nav>
    </>
  )
}

export default StationDock
