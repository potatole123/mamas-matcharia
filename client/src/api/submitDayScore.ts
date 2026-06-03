import { Fetch } from '../Fetch'
import type { DayScorePayload } from '../scoring/aggregateDayScore'

export type SubmitDayScoreResponse = {
  passed: boolean
  unlockedNextLevel: boolean
  targetScore: number
  level: number
  dayScore: DayScorePayload
}

/** Submit aggregated day score; backend handles coins, level unlock, recipe set. */
export async function submitDayScoreToBackend(
  dayScore: DayScorePayload,
  token: string,
): Promise<SubmitDayScoreResponse> {
  return Fetch<SubmitDayScoreResponse>('/api/game/results', {
    method: 'POST',
    token,
    body: { dayScore },
  })
}
