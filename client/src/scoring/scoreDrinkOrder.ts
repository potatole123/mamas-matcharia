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
  'matcha',
  'milk',
  'flavor',
  'sweetener',
] as const

const MEASUREMENT_RECIPE_FIELDS = ['iceLevel', 'sweetnessLevel'] as const
const TOPPING_FIELDS = ['creamTop', 'powder'] as const

const MAX_WAITING_SCORE = 5
const FULL_WAITING_SCORE_SECONDS = 40
const ZERO_WAITING_SCORE_SECONDS = 300
const AVERAGE_TIP_RATE = 0.25
const TIP_RATE_VARIANCE = 0.05

type RecipeScoreField =
  | (typeof ACCURACY_FIELDS)[number]
  | (typeof MEASUREMENT_RECIPE_FIELDS)[number]
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

function calculateTipRate() {
  const randomOffset = Math.random() * TIP_RATE_VARIANCE * 2 - TIP_RATE_VARIANCE
  return AVERAGE_TIP_RATE + randomOffset
}

function getExpectedMatchaGrams(recipe: Recipe) {
  return recipe.cupSize === 'large' ? 4 : 3
}

function getMadeMatchaGrams(submission: DrinkOrderSubmission) {
  const { bowlMatchaLevel } = submission.drink.whisking
  return bowlMatchaLevel === 'empty' ? 0 : Number(bowlMatchaLevel)
}

function calculateMeasurementScore(submission: DrinkOrderSubmission) {
  const recipeMeasurementScore = countMatches(
    submission.targetRecipe,
    submission.madeRecipe,
    MEASUREMENT_RECIPE_FIELDS,
  )
  const matchaAmountScore =
    getMadeMatchaGrams(submission) === getExpectedMatchaGrams(submission.targetRecipe) ? 1 : 0

  return recipeMeasurementScore + matchaAmountScore
}

/**
 * Score one served drink against its order ticket.
 *
 * Missing milk is equivalent to "none"; missing matcha grade is a mismatch.
 * Matcha amount is measured as 3g for small cups and 4g for large cups.
 * Waiting score is full through 40 seconds, then linearly decays to 0 at 300 seconds.
 * Tips are calculated from a per-order random tip rate centered at 25%.
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
  const measurementScore = calculateMeasurementScore(submission)
  const toppingScore = countMatches(
    submission.targetRecipe,
    submission.madeRecipe,
    TOPPING_FIELDS,
  )
  const waitingScore = calculateWaitingScore(timing)
  const totalScore = accuracyScore + measurementScore + toppingScore + waitingScore
  const tipsEarned = Math.round(totalScore * calculateTipRate() * 100) / 100

  return {
    waitingScore,
    accuracyScore,
    measurementScore,
    toppingScore,
    totalScore,
    tipsEarned,
  }
}
