import type {
  DrinkOrderScoreTiming,
  DrinkOrderSubmission,
  MadeRecipe,
  OrderScoreResult,
} from '../types/drinkSubmission'
import type { Recipe } from '../types/game'

const ACCURACY_FIELDS = [
  'cupSize',
  'temp',
  'iceLevel',
  'milk',
  'flavor',
  'sweetener',
] as const

const MEASUREMENT_FIELDS = ['matcha', 'sweetnessLevel'] as const
const TOPPING_FIELDS = ['creamTop', 'powder'] as const

const MAX_WAITING_SCORE = 10
const FULL_WAITING_SCORE_SECONDS = 30
const ZERO_WAITING_SCORE_SECONDS = 90
const TIP_RATE = 0.5

type RecipeScoreField =
  | (typeof ACCURACY_FIELDS)[number]
  | (typeof MEASUREMENT_FIELDS)[number]
  | (typeof TOPPING_FIELDS)[number]

function normalizeRecipeValue(
  recipe: Recipe | MadeRecipe,
  field: RecipeScoreField,
): string | undefined {
  const value = recipe[field]
  if (field === 'milk') {
    return value ?? 'none'
  }
  return value
}

function countMatches(
  target: Recipe,
  made: MadeRecipe,
  fields: readonly RecipeScoreField[],
): number {
  return fields.filter(
    (field) => normalizeRecipeValue(target, field) === normalizeRecipeValue(made, field),
  ).length
}

function calculateWaitingScore(timing?: DrinkOrderScoreTiming) {
  if (!timing) {
    return 0
  }

  const elapsedSeconds = Math.max(
    0,
    (timing.servedAt.getTime() - timing.orderCreatedAt.getTime()) / 1000,
  )

  if (elapsedSeconds <= FULL_WAITING_SCORE_SECONDS) {
    return MAX_WAITING_SCORE
  }

  if (elapsedSeconds >= ZERO_WAITING_SCORE_SECONDS) {
    return 0
  }

  const decayProgress =
    (elapsedSeconds - FULL_WAITING_SCORE_SECONDS) /
    (ZERO_WAITING_SCORE_SECONDS - FULL_WAITING_SCORE_SECONDS)

  return Math.round(MAX_WAITING_SCORE * (1 - decayProgress))
}

/**
 * Score one served drink against its order ticket.
 *
 * Missing milk is equivalent to "none"; missing matcha is a mismatch.
 * Waiting score is full through 30 seconds, then linearly decays to 0 at 90 seconds.
 */
export function scoreDrinkOrder(
  submission: DrinkOrderSubmission,
  timing?: DrinkOrderScoreTiming,
): OrderScoreResult {
  const accuracyScore = countMatches(
    submission.targetRecipe,
    submission.madeRecipe,
    ACCURACY_FIELDS,
  )
  const measurementScore = countMatches(
    submission.targetRecipe,
    submission.madeRecipe,
    MEASUREMENT_FIELDS,
  )
  const toppingScore = countMatches(
    submission.targetRecipe,
    submission.madeRecipe,
    TOPPING_FIELDS,
  )
  const waitingScore = calculateWaitingScore(timing)
  const totalScore = accuracyScore + measurementScore + toppingScore + waitingScore
  const tipsEarned = Math.round(totalScore * TIP_RATE * 100) / 100

  return {
    waitingScore,
    accuracyScore,
    measurementScore,
    toppingScore,
    totalScore,
    tipsEarned,
  }
}
