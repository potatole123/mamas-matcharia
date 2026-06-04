import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  endMultiplayerGame,
  getCurrentMultiplayerRoom,
  leaveMultiplayerGame,
  releaseMultiplayerRoomOnPageExit,
  startMultiplayerGame,
  type MultiplayerGame,
  type MultiplayerRoom,
  toMultiplayerRoom,
} from '../api/multiplayer'
import { useAuth } from '../auth'
import bearista from '../assets/multiplayer/bearista_front.png'
import stationTable from '../assets/station-shared/station-table.png'
import './StationPage.css'

const ROOM_REFRESH_INTERVAL_MS = 2000

type WaitingRoomLocationState = {
  game?: MultiplayerGame
}

function WaitingRoomPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { getIdToken, user } = useAuth()
  const routeGame = (location.state as WaitingRoomLocationState | null)?.game ?? null
  const [room, setRoom] = useState<MultiplayerRoom | null>(
    routeGame ? toMultiplayerRoom(routeGame) : null,
  )
  const [error, setError] = useState('')
  const [roomEnded, setRoomEnded] = useState(false)
  const [isLeavingRoom, setIsLeavingRoom] = useState(false)
  const [isStartingGame, setIsStartingGame] = useState(false)
  const hasSeenRoomRef = useRef(Boolean(routeGame))
  const latestTokenRef = useRef<string | null>(null)
  const shouldReleaseRoomOnPageExitRef = useRef(false)
  const isCreatorRef = useRef(false)
  const game = room?.game ?? null
  const playerCount = room?.playerCount ?? null
  const isCreator = Boolean(game && user?.uid === game.creatorId)

  useEffect(() => {
    isCreatorRef.current = isCreator
    shouldReleaseRoomOnPageExitRef.current = Boolean(game && !game.startedAt)
  }, [game, isCreator])

  useEffect(() => {
    if (game?.startedAt) {
      shouldReleaseRoomOnPageExitRef.current = false
      navigate('/order-station')
    }
  }, [game?.startedAt, navigate])

  useEffect(() => {
    const releaseRoom = () => {
      const token = latestTokenRef.current

      if (!token || !shouldReleaseRoomOnPageExitRef.current) {
        return
      }

      shouldReleaseRoomOnPageExitRef.current = false
      releaseMultiplayerRoomOnPageExit(token, isCreatorRef.current)
    }

    window.addEventListener('pagehide', releaseRoom)
    window.addEventListener('beforeunload', releaseRoom)

    return () => {
      window.removeEventListener('pagehide', releaseRoom)
      window.removeEventListener('beforeunload', releaseRoom)
    }
  }, [])


  useEffect(() => {
    let isSubscribed = true
    let refreshIntervalId: number | null = null

    async function loadCurrentGame() {
      try {
        const token = await getIdToken()

        if (!token) {
          throw new Error('Authentication token is unavailable')
        }

        latestTokenRef.current = token
        const currentRoom = await getCurrentMultiplayerRoom(token)

        if (isSubscribed) {
          if (currentRoom) {
            hasSeenRoomRef.current = true
            setRoomEnded(false)
          } else if (hasSeenRoomRef.current) {
            setRoomEnded(true)
          }
          setRoom(currentRoom)
          setError('')
        }
      } catch (loadError) {
        if (isSubscribed) {
          const message = loadError instanceof Error ? loadError.message : 'Could not load room'
          setError(message)
        }
      }
    }

    void loadCurrentGame()
    refreshIntervalId = window.setInterval(loadCurrentGame, ROOM_REFRESH_INTERVAL_MS)

    return () => {
      isSubscribed = false
      if (refreshIntervalId !== null) {
        window.clearInterval(refreshIntervalId)
      }
    }
  }, [getIdToken])

  async function handleRoomExit() {
    if (!game) {
      navigate('/home')
      return
    }

    setIsLeavingRoom(true)
    setError('')

    try {
      const token = await getIdToken()

      if (!token) {
        throw new Error('Authentication token is unavailable')
      }

      if (isCreator) {
        await endMultiplayerGame(token)
      } else {
        await leaveMultiplayerGame(token)
      }

      shouldReleaseRoomOnPageExitRef.current = false
      navigate('/home')
    } catch (exitError) {
      const message = exitError instanceof Error ? exitError.message : 'Could not leave room'
      setError(message)
    } finally {
      setIsLeavingRoom(false)
    }
  }

  async function handleStartGame() {
    if (!room?.canStart) {
      setError(`You need ${room?.minPlayers ?? 2}-${room?.maxPlayers ?? 4} players to start.`)
      return
    }

    setIsStartingGame(true)
    setError('')

    try {
      const token = await getIdToken()

      if (!token) {
        throw new Error('Authentication token is unavailable')
      }

      const { game: startedGame } = await startMultiplayerGame(token)
      setRoom(toMultiplayerRoom(startedGame))
      shouldReleaseRoomOnPageExitRef.current = false
      navigate('/order-station')
    } catch (startError) {
      const message = startError instanceof Error ? startError.message : 'Could not start game'
      setError(message)
    } finally {
      setIsStartingGame(false)
    }
  }

  return (
    <main className="station-page" aria-label="Waiting room page">
      <section className="station-stage">
        <img className="station-background" src={stationTable} alt="" draggable="false" />
        <div className="waiting-room-panel">
          <p className="waiting-room-code">
            {game
              ? `Join code: ${game.groupCode}`
              : roomEnded
                ? 'Room ended'
                : 'Loading room...'}
          </p>
          <p className="waiting-room-count">
            {playerCount == null
              ? roomEnded
                ? 'This room is no longer active.'
                : 'Waiting for players...'
              : `Players: ${playerCount} / ${room?.maxPlayers ?? 4}`}
          </p>
          <div
            className="waiting-room-bears"
            aria-label={`${playerCount ?? 0} of ${room?.maxPlayers ?? 4} players`}
          >
            {Array.from({ length: room?.maxPlayers ?? 4 }, (_, index) => {
              const isFilled = index < (playerCount ?? 0)

              return (
                <div
                  className={`waiting-room-bear-slot${isFilled ? ' is-filled' : ''}`}
                  key={index}
                  aria-hidden="true"
                >
                  <img src={bearista} alt="" draggable="false" />
                </div>
              )
            })}
          </div>
          {error && <p className="waiting-room-error">{error}</p>}
          <div className="waiting-room-actions">
            {game && isCreator && (
              <button
                className="waiting-room-action"
                type="button"
                onClick={handleStartGame}
                disabled={!room?.canStart || isStartingGame || isLeavingRoom}
              >
                {isStartingGame ? 'Starting...' : 'Start game'}
              </button>
            )}
            <button
              className="waiting-room-action waiting-room-exit-action"
              type="button"
              onClick={handleRoomExit}
              disabled={isLeavingRoom || isStartingGame}
            >
              {game && isCreator
                ? isLeavingRoom
                  ? 'Ending...'
                  : 'End room'
                : isLeavingRoom
                  ? 'Leaving...'
                  : 'Leave room'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default WaitingRoomPage
