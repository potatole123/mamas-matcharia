import { useNavigate } from 'react-router-dom'
import orderButton from '../assets/station-shared/order-button.png'
import baseButton from '../assets/station-shared/base-button.png'
import whiskingButton from '../assets/station-shared/whisking-button.png'
import toppingButton from '../assets/station-shared/topping-button.png'
import './StationDock.css'

type StationKey = 'order' | 'base' | 'whisking' | 'topping'

type StationDockProps = {
  currentStation: StationKey
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

function StationDock({ currentStation }: StationDockProps) {
  const navigate = useNavigate()

  return (
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
            onClick={() => navigate(station.path)}
          >
            <img src={station.imageSrc} alt="" draggable="false" />
          </button>
        )
      })}
    </nav>
  )
}

export default StationDock
