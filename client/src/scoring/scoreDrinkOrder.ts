import type {
  DrinkOrderScoreTiming,
  DrinkOrderSubmission,
  OrderScoreResult,
} from '../types/drinkSubmission'

/**
 * Score one served drink against its order ticket.
 *
 * Replace this stub (or call repo-root `calculateScore` from /scoring.ts) when wiring scoring.
 * Requires `DrinkOrderScoreTiming` for waiting score when the ticket has order timestamps.
 */
export function scoreDrinkOrder(
  _submission: DrinkOrderSubmission,
  _timing?: DrinkOrderScoreTiming,
): OrderScoreResult | null {
  return null
}
