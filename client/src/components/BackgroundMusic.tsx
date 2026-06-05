import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import backgroundTrack from '../music/magnific-cachito.mp3'
import mutedButtonImage from '../music/b7e9f4f2-e274-474d-bb23-1cf82641a1da.png'
import unmutedButtonImage from '../music/3c26ffa9-f70b-45a9-a6f1-1fbe315a9884.png'
import './BackgroundMusic.css'

const MUSIC_MUTED_STORAGE_KEY = 'mamas-matcharia-music-muted'

const STATION_PATHS = new Set([
  '/order-station',
  '/base-station',
  '/whisking-station',
  '/topping-station',
])

function readMutedPreference() {
  try {
    return window.localStorage.getItem(MUSIC_MUTED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function BackgroundMusic() {
  const { pathname } = useLocation()
  const isStationLayout = STATION_PATHS.has(pathname)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isMuted, setIsMuted] = useState(readMutedPreference)
  const [needsUserGesture, setNeedsUserGesture] = useState(false)

  const tryPlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || isMuted) {
      return
    }

    try {
      await audio.play()
      setNeedsUserGesture(false)
    } catch {
      setNeedsUserGesture(true)
    }
  }, [isMuted])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    audio.muted = isMuted
    if (isMuted) {
      audio.pause()
      return
    }

    void tryPlay()
  }, [isMuted, tryPlay])

  useEffect(() => {
    if (!needsUserGesture || isMuted) {
      return
    }

    function resumeOnGesture() {
      void tryPlay()
    }

    window.addEventListener('pointerdown', resumeOnGesture, { once: true })
    return () => window.removeEventListener('pointerdown', resumeOnGesture)
  }, [isMuted, needsUserGesture, tryPlay])

  function handleToggleMute() {
    setIsMuted((current) => {
      const next = !current
      try {
        window.localStorage.setItem(MUSIC_MUTED_STORAGE_KEY, String(next))
      } catch {
        // Ignore storage failures.
      }
      return next
    })
  }

  return (
    <>
      <audio ref={audioRef} src={backgroundTrack} loop preload="auto" />
      <button
        className={`background-music-toggle${isStationLayout ? ' is-station-layout' : ''}${isMuted ? ' is-muted' : ''}`}
        type="button"
        aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
        aria-pressed={isMuted}
        onClick={handleToggleMute}
      >
        <img
          src={isMuted ? mutedButtonImage : unmutedButtonImage}
          alt=""
          draggable="false"
        />
      </button>
    </>
  )
}

export default BackgroundMusic
