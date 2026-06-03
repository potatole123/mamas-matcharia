import type { OrderScoreResult } from '../types/drinkSubmission'

export type DayScorePayload = OrderScoreResult

/** Sum per-order scores into one day payload for POST /api/game/results. */
export function aggregateOrderScores(scores: OrderScoreResult[]): DayScorePayload {
  return scores.reduce(
    (totals, score) => ({
      waitingScore: totals.waitingScore + score.waitingScore,
      accuracyScore: totals.accuracyScore + score.accuracyScore,
      measurementScore: totals.measurementScore + score.measurementScore,
      toppingScore: totals.toppingScore + score.toppingScore,
      totalScore: totals.totalScore + score.totalScore,
      tipsEarned: totals.tipsEarned + score.tipsEarned,
    }),
    {
      waitingScore: 0,
      accuracyScore: 0,
      measurementScore: 0,
      toppingScore: 0,
      totalScore: 0,
      tipsEarned: 0,
    },
  )
}
