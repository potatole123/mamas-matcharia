import type { DrinkSize } from './drinkCup'

export type FlavorOption = 'strawberry' | 'mango' | 'pandan'
export type SweetenerOption = 'honey' | 'agave' | 'equal'
export type SweetnessLevel = 'less' | 'perfect' | 'extra'

export type BaseStationState = {
  drinkSize: DrinkSize
  cupPlaced: boolean
  cupHasIce: boolean
  cupHasMilk: boolean
  pitcherHasMilk: boolean
  selectedFlavor: FlavorOption | null
  selectedSweetener: SweetenerOption | null
  sweetnessLevel: SweetnessLevel | null
}

export const INITIAL_BASE_STATION: BaseStationState = {
  drinkSize: 'small',
  cupPlaced: false,
  cupHasIce: false,
  cupHasMilk: false,
  pitcherHasMilk: false,
  selectedFlavor: null,
  selectedSweetener: null,
  sweetnessLevel: null,
}

export type BowlMatchaLevel = 'empty' | '1' | '2' | '3' | '4' | '5' | '6'

export type WhiskingStationState = {
  bowlMatchaLevel: BowlMatchaLevel
  bowlHasWater: boolean
  isWhisked: boolean
  totalWeight: number
}

export const INITIAL_WHISKING_STATION: WhiskingStationState = {
  bowlMatchaLevel: 'empty',
  bowlHasWater: false,
  isWhisked: false,
  totalWeight: 0,
}

export type { DrinkSize }
