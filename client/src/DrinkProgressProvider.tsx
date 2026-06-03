import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { BaseCupSnapshot } from './drinkCup'
import { DrinkProgressContext } from './DrinkProgressContext'
import {
  INITIAL_BASE_STATION,
  INITIAL_WHISKING_STATION,
  type BaseStationState,
  type WhiskingStationState,
} from './stationProgress'

export function DrinkProgressProvider({ children }: { children: ReactNode }) {
  const [baseStation, setBaseStation] = useState<BaseStationState>(INITIAL_BASE_STATION)
  const [whiskingStation, setWhiskingStation] = useState<WhiskingStationState>(INITIAL_WHISKING_STATION)
  const [whiskingCup, setWhiskingCup] = useState<BaseCupSnapshot | null>(null)
  const [toppingCup, setToppingCup] = useState<BaseCupSnapshot | null>(null)

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

  const resetBaseStation = useCallback(() => {
    setBaseStation(INITIAL_BASE_STATION)
  }, [])

  const updateWhiskingStation = useCallback(
    (
      patch:
        | Partial<WhiskingStationState>
        | ((prev: WhiskingStationState) => Partial<WhiskingStationState>),
    ) => {
      setWhiskingStation((prev) => ({
        ...prev,
        ...(typeof patch === 'function' ? patch(prev) : patch),
      }))
    },
    [],
  )

  const resetWhiskingStation = useCallback(() => {
    setWhiskingStation(INITIAL_WHISKING_STATION)
  }, [])

  const sendCupToWhisking = useCallback((cup: BaseCupSnapshot) => {
    setWhiskingCup(cup)
  }, [])

  const updateWhiskingCup = useCallback(
    (
      patch:
        | Partial<BaseCupSnapshot>
        | ((prev: BaseCupSnapshot) => Partial<BaseCupSnapshot>),
    ) => {
      setWhiskingCup((prev) => {
        if (!prev) {
          return prev
        }
        return typeof patch === 'function' ? { ...prev, ...patch(prev) } : { ...prev, ...patch }
      })
    },
    [],
  )

  const clearWhiskingCup = useCallback(() => {
    setWhiskingCup(null)
  }, [])

  const sendCupToTopping = useCallback((cup: BaseCupSnapshot) => {
    setToppingCup(cup)
  }, [])

  const clearToppingCup = useCallback(() => {
    setToppingCup(null)
  }, [])

  const resetAllStationProgress = useCallback(() => {
    setBaseStation(INITIAL_BASE_STATION)
    setWhiskingStation(INITIAL_WHISKING_STATION)
    setWhiskingCup(null)
    setToppingCup(null)
  }, [])

  const value = useMemo(
    () => ({
      baseStation,
      updateBaseStation,
      resetBaseStation,
      whiskingStation,
      updateWhiskingStation,
      resetWhiskingStation,
      whiskingCup,
      sendCupToWhisking,
      updateWhiskingCup,
      clearWhiskingCup,
      toppingCup,
      sendCupToTopping,
      clearToppingCup,
      resetAllStationProgress,
    }),
    [
      baseStation,
      clearToppingCup,
      clearWhiskingCup,
      resetAllStationProgress,
      resetBaseStation,
      resetWhiskingStation,
      sendCupToTopping,
      sendCupToWhisking,
      toppingCup,
      updateBaseStation,
      updateWhiskingCup,
      updateWhiskingStation,
      whiskingCup,
      whiskingStation,
    ],
  )

  return <DrinkProgressContext.Provider value={value}>{children}</DrinkProgressContext.Provider>
}
