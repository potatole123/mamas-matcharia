import { createContext, useContext } from 'react'
import type { useGameDay } from './hooks/useGameDay'

type GameDayContextValue = ReturnType<typeof useGameDay>

export const GameDayContext = createContext<GameDayContextValue | null>(null)

export function useGameDayContext() {
  const context = useContext(GameDayContext)
  if (!context) {
    throw new Error('useGameDayContext must be used within a GameDayProvider')
  }
  return context
}
