import type { Recipe } from './game'
import type { BaseCupSnapshot } from '../drinkCup'
import { INITIAL_WHISKING_STATION, type WhiskingStationState } from '../stationProgress'
import type { Status } from '../../../server/src/types/enums'

export type DrinkStation = 'base' | 'whisking' | 'topping' | 'served'

/**
 * In-progress drink object: created at base when the player picks a cup size,
 * updated at each station, then submitted with an order ticket at topping (see
 * createDrinkOrderSubmission / submitDrinkWithOrder).
 */
/** Recipe fields the player builds across stations (matches design-doc / server enums). */
export type PlayerDrinkRecipe = Partial<
  Pick<
    Recipe,
    | 'cupSize'
    | 'temp'
    | 'iceLevel'
    | 'matcha'
    | 'milk'
    | 'flavor'
    | 'sweetener'
    | 'sweetnessLevel'
    | 'creamTop'
    | 'powder'
  >
>

export type InProgressDrink = {
  id: string
  orderId: number | null
  status: Status
  station: DrinkStation
  recipe: PlayerDrinkRecipe
  cupVisual: BaseCupSnapshot
  whisking: WhiskingStationState
  createdAt: string
}

export const INITIAL_WHISKING_ON_DRINK: WhiskingStationState = {
  ...INITIAL_WHISKING_STATION,
}

export function createDrinkId() {
  return `drink-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createInProgressDrink(cupSize: 'small' | 'large'): InProgressDrink {
  return {
    id: createDrinkId(),
    orderId: null,
    status: 'in_progress',
    station: 'base',
    recipe: {
      cupSize,
      temp: 'hot',
      iceLevel: 'none',
      flavor: 'none',
      sweetener: 'none',
      sweetnessLevel: 'none',
      creamTop: 'none',
      powder: 'none',
    },
    cupVisual: {
      size: cupSize,
      iceLevel: 'none',
      hasMilk: false,
    },
    whisking: { ...INITIAL_WHISKING_ON_DRINK },
    createdAt: new Date().toISOString(),
  }
}
