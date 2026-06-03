import type { Milk } from '../../server/src/types/enums'
import type { DrinkSize } from './drinkCup'

export type FlavorOption = 'strawberry' | 'mango' | 'pandan'
export type SweetenerOption = 'honey' | 'agave' | 'equal'
export type SweetnessLevel = 'less' | 'perfect' | 'extra'

/** Persisted base-station UI state not stored on the drink recipe. */
export type BaseStationState = {
  pitcherHasMilk: boolean
  /** Milk type currently in the pitcher (set when a carton is poured into the pitcher). */
  pitcherMilk: Milk | null
}

export const INITIAL_BASE_STATION: BaseStationState = {
  pitcherHasMilk: false,
  pitcherMilk: null,
}

export type BowlMatchaLevel = 'empty' | '1' | '2' | '3' | '4' | '5' | '6'

export type MatchaTin = 1 | 2 | 3

export type WhiskingStationState = {
  bowlMatchaLevel: BowlMatchaLevel
  bowlHasWater: boolean
  isWhisked: boolean
  totalWeight: number
  /** First tin used locks the grade for this bowl session; other tins are disabled. */
  selectedMatchaTin: MatchaTin | null
}

export const INITIAL_WHISKING_STATION: WhiskingStationState = {
  bowlMatchaLevel: 'empty',
  bowlHasWater: false,
  isWhisked: false,
  totalWeight: 0,
  selectedMatchaTin: null,
}

export type { DrinkSize }
