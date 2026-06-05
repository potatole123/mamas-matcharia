import type { Milk } from '../../server/src/types/enums'
import type { DrinkSize } from './drinkCup'

export type FlavorOption = 'strawberry' | 'mango' | 'pandan'
export type SweetenerOption = 'honey' | 'agave' | 'equal'
export type SweetnessLevel = 'less' | 'perfect' | 'extra'

export type PitcherAnimPhase = 'idle' | 'at-heater' | 'over-cup' | 'pouring' | 'return'

/** In-progress heat-and-pour sequence; timers run in DrinkProgressProvider across routes. */
export type PitcherHeatJob = {
  drinkId: string
  milk: Milk | null
  keepIced: boolean
  startedAt: number
}

/** Persisted base-station UI state not stored on the drink recipe. */
export type BaseStationState = {
  pitcherHasMilk: boolean
  /** Milk type currently in the pitcher (set when a carton is poured into the pitcher). */
  pitcherMilk: Milk | null
  pitcherHeatJob: PitcherHeatJob | null
}

export const INITIAL_BASE_STATION: BaseStationState = {
  pitcherHasMilk: false,
  pitcherMilk: null,
  pitcherHeatJob: null,
}

export type BowlMatchaLevel = 'empty' | '1' | '2' | '3' | '4' | '5' | '6'

export type MatchaTin = 1 | 2 | 3

export const WHISK_DURATION_MS = 10_000
export const HEAT_MILK_DURATION_MS = 10_000
export const PITCHER_TO_CUP_MS = 800
export const PITCHER_ROTATE_MS = 600
export const PITCHER_POUR_MS = 600
export const PITCHER_RETURN_MS = 800

export function getPitcherPourCompleteMs() {
  return HEAT_MILK_DURATION_MS + PITCHER_TO_CUP_MS + PITCHER_ROTATE_MS + PITCHER_POUR_MS
}

export function getPitcherJobCompleteMs() {
  return getPitcherPourCompleteMs() + PITCHER_RETURN_MS
}

export function getPitcherAnimPhase(
  job: PitcherHeatJob | null,
  now: number = Date.now(),
): PitcherAnimPhase {
  if (!job) {
    return 'idle'
  }

  const elapsed = now - job.startedAt
  if (elapsed < HEAT_MILK_DURATION_MS) {
    return 'at-heater'
  }
  if (elapsed < HEAT_MILK_DURATION_MS + PITCHER_TO_CUP_MS) {
    return 'over-cup'
  }
  if (elapsed < getPitcherPourCompleteMs()) {
    return 'pouring'
  }
  if (elapsed < getPitcherJobCompleteMs()) {
    return 'return'
  }
  return 'idle'
}

export function getMilkHeatProgress(job: PitcherHeatJob | null, now: number = Date.now()) {
  if (!job) {
    return 0
  }

  const elapsed = now - job.startedAt
  if (elapsed >= HEAT_MILK_DURATION_MS) {
    return 100
  }
  return Math.min(100, (elapsed / HEAT_MILK_DURATION_MS) * 100)
}

export type WhiskingStationState = {
  bowlMatchaLevel: BowlMatchaLevel
  bowlHasWater: boolean
  isWhisked: boolean
  totalWeight: number
  /** First tin used locks the grade for this bowl session; other tins are disabled. */
  selectedMatchaTin: MatchaTin | null
  /** Wall-clock start of an in-progress whisk; completes in the background across routes. */
  whiskStartedAt: number | null
}

export const INITIAL_WHISKING_STATION: WhiskingStationState = {
  bowlMatchaLevel: 'empty',
  bowlHasWater: false,
  isWhisked: false,
  totalWeight: 0,
  selectedMatchaTin: null,
  whiskStartedAt: null,
}

export type { DrinkSize }
