import { useCallback, useEffect, useRef, useState } from 'react'
import { Fetch } from '../Fetch'
import { useAuth } from '../auth'
import type {
  Drink,
  GameDay,
  ScheduledNpc,
  StartGameDayResponse,
} from '../types/game'

const FREE_PLAY_DAY: GameDay = {
  level: 0,
  mode: 'freeplay',
  gameId: 'local-freeplay',
  seed: 0,
  targetScore: 0,
  npcCount: 0,
  npcFrequencySeconds: 0,
}

const FREE_PLAY_DAY_STATE: StartGameDayResponse = {
  day: FREE_PLAY_DAY,
  npcs: [],
}

const MIN_NPC_SPAWN_INTERVAL_SECONDS = 10
const MAX_NPC_SPAWN_INTERVAL_SECONDS = 60

type GameplaySessionResponse = {
  session: {
    activeGame: unknown | null
  } | null
}

function makeSeededRandom(seed: number) {
  let state = seed >>> 0

  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getSpawnIntervalSeconds(randomValue: number, targetAverageSeconds: number) {
  const intervalRange = MAX_NPC_SPAWN_INTERVAL_SECONDS - MIN_NPC_SPAWN_INTERVAL_SECONDS
  const targetAverage = clamp(
    Number.isFinite(targetAverageSeconds) ? targetAverageSeconds : 15,
    MIN_NPC_SPAWN_INTERVAL_SECONDS + 0.001,
    MAX_NPC_SPAWN_INTERVAL_SECONDS,
  )
  const randomExponent = intervalRange / (targetAverage - MIN_NPC_SPAWN_INTERVAL_SECONDS) - 1

  return (
    MIN_NPC_SPAWN_INTERVAL_SECONDS +
    intervalRange * randomValue ** randomExponent
  )
}

function createDrink(npc: ScheduledNpc): Drink {
  return {
    npcId: npc.npcId,
    orderId: npc.order.orderId,
    orderNumber: npc.orderNumber,
    recipe: {},
    startTime: new Date().toISOString(),
    measurements: {},
  }
}

export function useGameDay() {
  const { getIdToken, user } = useAuth()
  const [dayState, setDayState] = useState<StartGameDayResponse | null>(null)
  const [waitingNpcs, setWaitingNpcs] = useState<ScheduledNpc[]>([])
  const [drinksByOrderId, setDrinksByOrderId] = useState<Record<number, Drink>>({})
  const [dayStartError, setDayStartError] = useState<string | null>(null)
  const [isStartingDay, setIsStartingDay] = useState(false)
  const dayStateRef = useRef<StartGameDayResponse | null>(null)
  const spawnTimeoutsRef = useRef<number[]>([])
  const startDayPromiseRef = useRef<Promise<StartGameDayResponse | null> | null>(null)
  const activeUserIdRef = useRef(user?.uid)
  const shouldShowLevelBannerRef = useRef(false)
  const activeModeRef = useRef<GameDay['mode'] | null>(null)

  const clearSpawnTimeouts = useCallback(() => {
    for (const timeoutId of spawnTimeoutsRef.current) {
      window.clearTimeout(timeoutId)
    }
    spawnTimeoutsRef.current = []
  }, [])

  const resetDay = useCallback(() => {
    clearSpawnTimeouts()
    startDayPromiseRef.current = null
    activeModeRef.current = null
    dayStateRef.current = null
    setDayState(null)
    setWaitingNpcs([])
    setDrinksByOrderId({})
    setDayStartError(null)
    setIsStartingDay(false)
    shouldShowLevelBannerRef.current = false
  }, [clearSpawnTimeouts])

  useEffect(() => clearSpawnTimeouts, [clearSpawnTimeouts])

  useEffect(() => {
    if (activeUserIdRef.current === user?.uid) {
      return
    }

    activeUserIdRef.current = user?.uid
    const resetTimeoutId = window.setTimeout(resetDay, 0)

    return () => window.clearTimeout(resetTimeoutId)
  }, [resetDay, user?.uid])

  const spawnNpc = useCallback((npc: ScheduledNpc) => {
    setWaitingNpcs((currentNpcs) => [...currentNpcs, npc])
    setDrinksByOrderId((currentDrinks) => ({
      ...currentDrinks,
      [npc.order.orderId]: createDrink(npc),
    }))
  }, [])

  const scheduleNpcs = useCallback(
    (dayPayload: StartGameDayResponse) => {
      clearSpawnTimeouts()
      activeModeRef.current = dayPayload.day.mode
      shouldShowLevelBannerRef.current = dayPayload.day.mode !== 'multiplayer'
      dayStateRef.current = dayPayload
      setDayState(dayPayload)
      setWaitingNpcs([])
      setDrinksByOrderId({})

      const random = makeSeededRandom(dayPayload.day.seed)
      let elapsedMs = 0

      dayPayload.npcs.forEach((npc, index) => {
        if (index > 0) {
          const spawnIntervalSeconds = getSpawnIntervalSeconds(
            random(),
            dayPayload.day.npcFrequencySeconds,
          )
          elapsedMs += spawnIntervalSeconds * 1000
        }

        const scheduledNpc: ScheduledNpc = {
          ...npc,
          orderNumber: index + 1,
        }

        if (index === 0) {
          spawnNpc(scheduledNpc)
          return
        }

        const timeoutId = window.setTimeout(() => spawnNpc(scheduledNpc), elapsedMs)
        spawnTimeoutsRef.current.push(timeoutId)
      })
    },
    [clearSpawnTimeouts, spawnNpc],
  )

  const getRequiredIdToken = useCallback(async () => {
    const token = await getIdToken()
    if (!token) {
      throw new Error('Authentication token is unavailable')
    }
    return token
  }, [getIdToken])

  const startFreePlay = useCallback(() => {
    activeModeRef.current = 'freeplay'
    clearSpawnTimeouts()
    startDayPromiseRef.current = null
    setDayStartError(null)
    dayStateRef.current = FREE_PLAY_DAY_STATE
    setDayState(FREE_PLAY_DAY_STATE)
    setWaitingNpcs([])
    setDrinksByOrderId({})
    shouldShowLevelBannerRef.current = false
    return Promise.resolve(FREE_PLAY_DAY_STATE)
  }, [clearSpawnTimeouts])

  const startDay = useCallback(() => {
    if (activeModeRef.current === 'freeplay') {
      return Promise.resolve(null)
    }

    if (dayStateRef.current) {
      return Promise.resolve(null)
    }

    if (startDayPromiseRef.current) {
      return startDayPromiseRef.current
    }

    const startPromise: Promise<StartGameDayResponse | null> = (async () => {
      setIsStartingDay(true)
      setDayStartError(null)

      try {
        const token = await getRequiredIdToken()
        const { session } = await Fetch<GameplaySessionResponse>('/api/session', { token })

        if (!session?.activeGame) {
          await Fetch('/api/game/singleplayer', {
            method: 'POST',
            token,
            body: {},
          })
        }

        const dayPayload = await Fetch<StartGameDayResponse>('/api/game/day/start', {
          method: 'POST',
          token,
          body: {},
        })

        if (activeModeRef.current === 'freeplay') {
          return FREE_PLAY_DAY_STATE
        }

        scheduleNpcs(dayPayload)
        return dayPayload
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not start game day'
        setDayStartError(message)
        throw error
      } finally {
        setIsStartingDay(false)
      }
    })().finally(() => {
      if (startDayPromiseRef.current === startPromise) {
        startDayPromiseRef.current = null
      }
    })

    startDayPromiseRef.current = startPromise
    return startPromise
  }, [getRequiredIdToken, scheduleNpcs])

  const claimWaitingNpc = useCallback((npcId: number) => {
    setWaitingNpcs((currentNpcs) => currentNpcs.filter((npc) => npc.npcId !== npcId))
  }, [])

  const consumeLevelBanner = useCallback(() => {
    if (!shouldShowLevelBannerRef.current) {
      return false
    }

    shouldShowLevelBannerRef.current = false
    return true
  }, [])

  const updateDrink = useCallback((orderId: number, updates: Partial<Drink>) => {
    setDrinksByOrderId((currentDrinks) => {
      const currentDrink = currentDrinks[orderId]
      if (!currentDrink) {
        return currentDrinks
      }

      return {
        ...currentDrinks,
        [orderId]: {
          ...currentDrink,
          ...updates,
          recipe: updates.recipe
            ? { ...currentDrink.recipe, ...updates.recipe }
            : currentDrink.recipe,
          measurements: updates.measurements
            ? { ...currentDrink.measurements, ...updates.measurements }
            : currentDrink.measurements,
        },
      }
    })
  }, [])

  const completeDrink = useCallback((orderId: number) => {
    updateDrink(orderId, { endTime: new Date().toISOString() })
  }, [updateDrink])

  return {
    dayState,
    waitingNpcs,
    drinksByOrderId,
    dayStartError,
    isStartingDay,
    startDay,
    startFreePlay,
    resetDay,
    consumeLevelBanner,
    claimWaitingNpc,
    updateDrink,
    completeDrink,
  }
}
