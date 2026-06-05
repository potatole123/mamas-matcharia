import type { GameDay } from '../types/game'

export function isFreePlayMode(day: GameDay | undefined): boolean {
  return day?.mode === 'freeplay'
}

/** Tutorial runs only during the first single-player campaign day. */
export function isTutorialGameplayMode(day: GameDay | undefined): boolean {
  return day?.mode === 'singleplayer'
}
