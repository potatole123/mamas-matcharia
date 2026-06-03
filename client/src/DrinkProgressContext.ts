import { createContext, useContext } from 'react'
import type { BaseCupSnapshot } from './drinkCup'
import type { BaseStationState, WhiskingStationState } from './stationProgress'

export type DrinkProgressContextValue = {
  baseStation: BaseStationState
  updateBaseStation: (
    patch: Partial<BaseStationState> | ((prev: BaseStationState) => Partial<BaseStationState>),
  ) => void
  resetBaseStation: () => void
  whiskingStation: WhiskingStationState
  updateWhiskingStation: (
    patch:
      | Partial<WhiskingStationState>
      | ((prev: WhiskingStationState) => Partial<WhiskingStationState>),
  ) => void
  resetWhiskingStation: () => void
  whiskingCup: BaseCupSnapshot | null
  sendCupToWhisking: (cup: BaseCupSnapshot) => void
  updateWhiskingCup: (
    patch: Partial<BaseCupSnapshot> | ((prev: BaseCupSnapshot) => Partial<BaseCupSnapshot>),
  ) => void
  clearWhiskingCup: () => void
  toppingCup: BaseCupSnapshot | null
  sendCupToTopping: (cup: BaseCupSnapshot) => void
  clearToppingCup: () => void
  resetAllStationProgress: () => void
}

export const DrinkProgressContext = createContext<DrinkProgressContextValue | null>(null)

export function useDrinkProgress() {
  const context = useContext(DrinkProgressContext)
  if (!context) {
    throw new Error('useDrinkProgress must be used within a DrinkProgressProvider')
  }
  return context
}
