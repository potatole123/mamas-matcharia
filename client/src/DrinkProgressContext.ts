import { createContext, useContext } from 'react'
import type { BaseCupSnapshot } from './drinkCup'
import type {
  DrinkOrderSubmission,
  ScoredDrinkOrderSubmission,
} from './types/drinkSubmission'
import type { TicketData } from './hooks/useOrderTickets'
import type { InProgressDrink, PlayerDrinkRecipe } from './types/playerDrink'
import type { BaseStationState, WhiskingStationState } from './stationProgress'
import type { Matcha } from '../../server/src/types/enums'

export type StationSlot = 'base' | 'whisking' | 'topping'

export type DrinkProgressContextValue = {
  drinks: Record<string, InProgressDrink>
  drinkAtBase: InProgressDrink | null
  drinkAtWhisking: InProgressDrink | null
  drinkAtTopping: InProgressDrink | null
  /** Single drink in the station pipeline (base → whisking → topping). */
  activePipelineDrink: InProgressDrink | null
  /** False while a cup is still on the base station (not after Ready sends it to whisking). */
  canCreateDrinkAtBase: boolean
  baseStation: BaseStationState
  updateBaseStation: (
    patch: Partial<BaseStationState> | ((prev: BaseStationState) => Partial<BaseStationState>),
  ) => void
  createDrinkAtBase: (cupSize: 'small' | 'large') => InProgressDrink | null
  updateDrink: (
    drinkId: string,
    patch: {
      recipe?: Partial<PlayerDrinkRecipe>
      cupVisual?: Partial<BaseCupSnapshot>
      whisking?: Partial<WhiskingStationState>
      orderId?: number | null
      status?: InProgressDrink['status']
      station?: InProgressDrink['station']
    },
  ) => void
  linkDrinkToOrder: (drinkId: string, orderId: number) => void
  resetAllStationProgress: () => void
  whiskingCup: BaseCupSnapshot | null
  sendCupToWhisking: (cup: BaseCupSnapshot) => void
  updateWhiskingCup: (
    patch: Partial<BaseCupSnapshot> | ((prev: BaseCupSnapshot) => Partial<BaseCupSnapshot>),
  ) => void
  clearWhiskingCup: () => void
  toppingCup: BaseCupSnapshot | null
  sendCupToTopping: (cup: BaseCupSnapshot) => void
  /** Served drinks paired with tickets (for scoring / day aggregation). */
  orderSubmissions: DrinkOrderSubmission[]
  scoredOrderSubmissions: ScoredDrinkOrderSubmission[]
  lastOrderSubmission: DrinkOrderSubmission | null
  /**
   * Finish topping: build submission from drink + ticket, mark served, sync game day.
   * Returns the payload for scoreDrinkOrder; optional score is stored when non-null.
   */
  submitDrinkWithOrder: (ticket: TicketData) => DrinkOrderSubmission | null
  clearToppingCup: () => void
  whiskingStation: WhiskingStationState
  /** Matcha grade chosen on whisking bench when no drink is on the station. */
  benchMatcha: Matcha | null
  setBenchMatcha: (matcha: Matcha) => void
  updateWhiskingStation: (
    patch:
      | Partial<WhiskingStationState>
      | ((prev: WhiskingStationState) => Partial<WhiskingStationState>),
  ) => void
}

export const DrinkProgressContext = createContext<DrinkProgressContextValue | null>(null)

export function useDrinkProgress() {
  const context = useContext(DrinkProgressContext)
  if (!context) {
    throw new Error('useDrinkProgress must be used within a DrinkProgressProvider')
  }
  return context
}
