import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { BaseCupSnapshot } from './drinkCup'
import { DrinkProgressContext, type StationSlot } from './DrinkProgressContext'
import { useGameDayContext } from './GameDayContext'
import { useOrderTicketsContext } from './OrderTicketsContext'
import { scoreDrinkOrder } from './scoring/scoreDrinkOrder'
import type {
  DrinkOrderSubmission,
  ScoredDrinkOrderSubmission,
} from './types/drinkSubmission'
import type { TicketData } from './hooks/useOrderTickets'
import { createDrinkOrderSubmission } from './utils/buildMadeRecipe'
import {
  INITIAL_BASE_STATION,
  INITIAL_WHISKING_STATION,
  type BaseStationState,
  type WhiskingStationState,
} from './stationProgress'
import type { Matcha } from '../../server/src/types/enums'
import {
  createInProgressDrink,
  type InProgressDrink,
} from './types/playerDrink'

type StationSlots = Record<StationSlot, string | null>

const EMPTY_SLOTS: StationSlots = { base: null, whisking: null, topping: null }

export function DrinkProgressProvider({ children }: { children: ReactNode }) {
  const { ticketStore } = useOrderTicketsContext()
  const { updateDrink: updateGameDayDrink, completeDrink } = useGameDayContext()
  const [drinks, setDrinks] = useState<Record<string, InProgressDrink>>({})
  const [orderSubmissions, setOrderSubmissions] = useState<DrinkOrderSubmission[]>([])
  const [scoredOrderSubmissions, setScoredOrderSubmissions] = useState<ScoredDrinkOrderSubmission[]>(
    [],
  )
  const [lastOrderSubmission, setLastOrderSubmission] = useState<DrinkOrderSubmission | null>(null)
  const [stationSlots, setStationSlots] = useState<StationSlots>(EMPTY_SLOTS)
  const [baseStation, setBaseStation] = useState<BaseStationState>(INITIAL_BASE_STATION)
  const [standaloneWhiskingStation, setStandaloneWhiskingStation] =
    useState<WhiskingStationState>(INITIAL_WHISKING_STATION)
  const [benchMatcha, setBenchMatchaState] = useState<Matcha | null>(null)

  const setBenchMatcha = useCallback((matcha: Matcha) => {
    setBenchMatchaState(matcha)
  }, [])

  const clearBenchMatcha = useCallback(() => {
    setBenchMatchaState(null)
  }, [])

  const drinkAtBase = stationSlots.base ? drinks[stationSlots.base] ?? null : null
  const drinkAtWhisking = stationSlots.whisking ? drinks[stationSlots.whisking] ?? null : null
  const drinkAtTopping = stationSlots.topping ? drinks[stationSlots.topping] ?? null : null

  const updateBaseStation = useCallback(
    (
      patch:
        | Partial<BaseStationState>
        | ((prev: BaseStationState) => Partial<BaseStationState>),
    ) => {
      setBaseStation((prev) => ({
        ...prev,
        ...(typeof patch === 'function' ? patch(prev) : patch),
      }))
    },
    [],
  )

  const updateDrink = useCallback(
    (
      drinkId: string,
      patch: {
        recipe?: Partial<InProgressDrink['recipe']>
        cupVisual?: Partial<BaseCupSnapshot>
        whisking?: Partial<WhiskingStationState>
        orderId?: number | null
        status?: InProgressDrink['status']
        station?: InProgressDrink['station']
      },
    ) => {
      setDrinks((prev) => {
        const current = prev[drinkId]
        if (!current) {
          return prev
        }

        const next: InProgressDrink = {
          ...current,
          orderId: patch.orderId !== undefined ? patch.orderId : current.orderId,
          status: patch.status ?? current.status,
          station: patch.station ?? current.station,
          recipe: patch.recipe ? { ...current.recipe, ...patch.recipe } : current.recipe,
          cupVisual: patch.cupVisual
            ? { ...current.cupVisual, ...patch.cupVisual }
            : current.cupVisual,
          whisking: patch.whisking
            ? { ...current.whisking, ...patch.whisking }
            : current.whisking,
        }

        return { ...prev, [drinkId]: next }
      })
    },
    [],
  )

  const moveDrinkToStation = useCallback((drinkId: string, station: StationSlot) => {
    setDrinks((prev) => {
      const current = prev[drinkId]
      if (!current) {
        return prev
      }
      return {
        ...prev,
        [drinkId]: { ...current, station },
      }
    })

    setStationSlots((prev) => {
      const next: StationSlots = { ...prev }
      for (const slot of ['base', 'whisking', 'topping'] as const) {
        if (next[slot] === drinkId) {
          next[slot] = null
        }
      }
      next[station] = drinkId
      return next
    })
  }, [])

  const createDrinkAtBase = useCallback(
    (cupSize: 'small' | 'large') => {
      if (stationSlots.base) {
        return drinks[stationSlots.base] ?? null
      }

      const orderId = ticketStore.mainTicket?.orderId ?? null
      const drink = createInProgressDrink(cupSize, orderId)

      setDrinks((prev) => ({ ...prev, [drink.id]: drink }))
      setStationSlots((prev) => ({ ...prev, base: drink.id }))
      return drink
    },
    [drinks, stationSlots.base, ticketStore.mainTicket?.orderId],
  )

  const linkDrinkToOrder = useCallback(
    (drinkId: string, orderId: number) => {
      updateDrink(drinkId, { orderId })
    },
    [updateDrink],
  )

  const activePipelineDrink = drinkAtBase ?? drinkAtWhisking ?? drinkAtTopping ?? null
  const canCreateDrinkAtBase = drinkAtBase === null

  useEffect(() => {
    const orderId = ticketStore.mainTicket?.orderId
    if (orderId === undefined || !activePipelineDrink || activePipelineDrink.orderId !== null) {
      return
    }
    updateDrink(activePipelineDrink.id, { orderId })
  }, [activePipelineDrink, ticketStore.mainTicket?.orderId, updateDrink])

  const resetAllStationProgress = useCallback(() => {
    setDrinks({})
    setStationSlots(EMPTY_SLOTS)
    setBaseStation(INITIAL_BASE_STATION)
    setStandaloneWhiskingStation(INITIAL_WHISKING_STATION)
    setBenchMatchaState(null)
    setOrderSubmissions([])
    setScoredOrderSubmissions([])
    setLastOrderSubmission(null)
  }, [])

  /** Bowl/bench is shared; a cup at the station can wait for topping while you prep the next batch here. */
  const whiskingStation = standaloneWhiskingStation

  const updateWhiskingStation = useCallback(
    (
      patch:
        | Partial<WhiskingStationState>
        | ((prev: WhiskingStationState) => Partial<WhiskingStationState>),
    ) => {
      setStandaloneWhiskingStation((prev) => ({
        ...prev,
        ...(typeof patch === 'function' ? patch(prev) : patch),
      }))
    },
    [],
  )

  const whiskingCup = drinkAtWhisking?.cupVisual ?? null
  const toppingCup = drinkAtTopping?.cupVisual ?? null

  const sendCupToWhisking = useCallback(
    (cup: BaseCupSnapshot) => {
      if (!drinkAtBase) {
        return
      }

      updateDrink(drinkAtBase.id, {
        cupVisual: cup,
      })
      moveDrinkToStation(drinkAtBase.id, 'whisking')
    },
    [drinkAtBase, moveDrinkToStation, updateDrink],
  )

  const updateWhiskingCup = useCallback(
    (
      patch:
        | Partial<BaseCupSnapshot>
        | ((prev: BaseCupSnapshot) => Partial<BaseCupSnapshot>),
    ) => {
      if (!drinkAtWhisking) {
        return
      }

      const nextCup =
        typeof patch === 'function' ? patch(drinkAtWhisking.cupVisual) : { ...drinkAtWhisking.cupVisual, ...patch }

      updateDrink(drinkAtWhisking.id, { cupVisual: nextCup })
    },
    [drinkAtWhisking, updateDrink],
  )

  const clearWhiskingCup = useCallback(() => {
    if (!drinkAtWhisking) {
      return
    }

    setDrinks((prev) => {
      const next = { ...prev }
      delete next[drinkAtWhisking.id]
      return next
    })
    setStationSlots((prev) => ({ ...prev, whisking: null }))
  }, [drinkAtWhisking])

  const sendCupToTopping = useCallback(
    (cup: BaseCupSnapshot) => {
      if (!drinkAtWhisking || drinkAtTopping) {
        return
      }

      updateDrink(drinkAtWhisking.id, { cupVisual: cup })
      moveDrinkToStation(drinkAtWhisking.id, 'topping')
    },
    [drinkAtTopping, drinkAtWhisking, moveDrinkToStation, updateDrink],
  )

  const clearToppingCup = useCallback(() => {
    if (!drinkAtTopping) {
      return
    }

    setDrinks((prev) => ({
      ...prev,
      [drinkAtTopping.id]: { ...drinkAtTopping, station: 'served', status: 'served' },
    }))
    setStationSlots((prev) => ({ ...prev, topping: null }))
  }, [drinkAtTopping])

  const submitDrinkWithOrder = useCallback(
    (ticket: TicketData): DrinkOrderSubmission | null => {
      if (!drinkAtTopping) {
        return null
      }

      const submission = createDrinkOrderSubmission(drinkAtTopping, ticket)
      const score = scoreDrinkOrder(submission)

      setOrderSubmissions((prev) => [...prev, submission])
      setLastOrderSubmission(submission)

      if (score) {
        setScoredOrderSubmissions((prev) => [...prev, { ...submission, score }])
      }

      if (submission.orderId) {
        updateGameDayDrink(submission.orderId, { recipe: submission.madeRecipe })
        completeDrink(submission.orderId)
      }

      setDrinks((prev) => ({
        ...prev,
        [drinkAtTopping.id]: submission.drink,
      }))
      setStationSlots((prev) => ({ ...prev, topping: null }))

      return submission
    },
    [completeDrink, drinkAtTopping, updateGameDayDrink],
  )

  const value = useMemo(
    () => ({
      drinks,
      drinkAtBase,
      drinkAtWhisking,
      drinkAtTopping,
      activePipelineDrink,
      canCreateDrinkAtBase,
      baseStation,
      updateBaseStation,
      createDrinkAtBase,
      updateDrink,
      linkDrinkToOrder,
      resetAllStationProgress,
      whiskingCup,
      sendCupToWhisking,
      updateWhiskingCup,
      clearWhiskingCup,
      toppingCup,
      sendCupToTopping,
      orderSubmissions,
      scoredOrderSubmissions,
      lastOrderSubmission,
      submitDrinkWithOrder,
      clearToppingCup,
      whiskingStation,
      standaloneWhiskingStation,
      benchMatcha,
      setBenchMatcha,
      clearBenchMatcha,
      updateWhiskingStation,
    }),
    [
      baseStation,
      benchMatcha,
      setBenchMatcha,
      clearBenchMatcha,
      standaloneWhiskingStation,
      clearToppingCup,
      clearWhiskingCup,
      createDrinkAtBase,
      activePipelineDrink,
      canCreateDrinkAtBase,
      drinkAtBase,
      drinkAtTopping,
      drinkAtWhisking,
      drinks,
      linkDrinkToOrder,
      moveDrinkToStation,
      resetAllStationProgress,
      sendCupToTopping,
      sendCupToWhisking,
      submitDrinkWithOrder,
      orderSubmissions,
      scoredOrderSubmissions,
      lastOrderSubmission,
      toppingCup,
      updateBaseStation,
      updateDrink,
      updateWhiskingCup,
      updateWhiskingStation,
      whiskingCup,
      whiskingStation,
    ],
  )

  return <DrinkProgressContext.Provider value={value}>{children}</DrinkProgressContext.Provider>
}
