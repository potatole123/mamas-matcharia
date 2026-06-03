import type { Recipe } from './game'
import type { InProgressDrink } from './playerDrink'

/** Recipe fields the player built (same enums as ticket); milk/matcha only when set at stations. */
export type MadeRecipe = Pick<
  Recipe,
  | 'cupSize'
  | 'temp'
  | 'iceLevel'
  | 'flavor'
  | 'sweetener'
  | 'sweetnessLevel'
  | 'creamTop'
  | 'powder'
> &
  Partial<Pick<Recipe, 'matcha' | 'milk'>>

/**
 * One completed drink paired with its order ticket — hand this to scoring.
 */
export type DrinkOrderSubmission = {
  drinkId: string
  orderId: number
  orderNumber: number
  servedAt: string
  targetRecipe: Recipe
  madeRecipe: MadeRecipe
  /** Full in-progress drink at serve time (recipe + station metadata). */
  drink: InProgressDrink
}

/** Per-order score (matches server dayResults score fields + repo scoring.ts). */
export type OrderScoreResult = {
  waitingScore: number
  accuracyScore: number
  measurementScore: number
  toppingScore: number
  totalScore: number
  tipsEarned: number
}

export type ScoredDrinkOrderSubmission = DrinkOrderSubmission & {
  score: OrderScoreResult
}

/** Optional timing inputs for waiting score (pass into scoreDrinkOrder). */
export type DrinkOrderScoreTiming = {
  orderCreatedAt: Date
  expirationTime: Date
  servedAt: Date
}
