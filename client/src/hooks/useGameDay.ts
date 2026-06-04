import { useCallback, useEffect, useRef, useState } from 'react'
import { Fetch } from '../Fetch'
import { useAuth } from '../auth'
import type {
  Drink,
  ScheduledNpc,
  StartGameDayResponse,
} from '../types/game'

const MIN_SPAWN_INTERVAL_MULTIPLIER = 0.5
const SPAWN_INTERVAL_MULTIPLIER_RANGE = 1

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
  const spawnTimeoutsRef = useRef<number[]>([])
  const startDayPromiseRef = useRef<Promise<StartGameDayResponse | null> | null>(null)
  const activeUserIdRef = useRef(user?.uid)
  const shouldShowLevelBannerRef = useRef(false)

  const clearSpawnTimeouts = useCallback(() => {
    for (const timeoutId of spawnTimeoutsRef.current) {
      window.clearTimeout(timeoutId)
    }
    spawnTimeoutsRef.current = []
  }, [])

  const resetDay = useCallback(() => {
    clearSpawnTimeouts()
    startDayPromiseRef.current = null
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
      shouldShowLevelBannerRef.current = dayPayload.day.mode !== 'multiplayer'
      setDayState(dayPayload)
      setWaitingNpcs([])
      setDrinksByOrderId({})

      const random = makeSeededRandom(dayPayload.day.seed)
      let elapsedMs = 0

      dayPayload.npcs.forEach((npc, index) => {
        if (index > 0) {
          const intervalMultiplier =
            MIN_SPAWN_INTERVAL_MULTIPLIER + random() * SPAWN_INTERVAL_MULTIPLIER_RANGE
          elapsedMs += dayPayload.day.npcFrequencySeconds * intervalMultiplier * 1000
        }

        const scheduledNpc: ScheduledNpc = {
          ...npc,
          orderNumber: index + 1,
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

  const startDay = useCallback(() => {
    if (dayState) {
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
  }, [dayState, getRequiredIdToken, scheduleNpcs])

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
    resetDay,
    consumeLevelBanner,
    claimWaitingNpc,
    updateDrink,
    completeDrink,
  }
}
