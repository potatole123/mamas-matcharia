import type { ReactNode } from 'react'
import { GameDayContext } from './GameDayContext'
import { useGameDay } from './hooks/useGameDay'

export function GameDayProvider({ children }: { children: ReactNode }) {
  const value = useGameDay()
  return <GameDayContext.Provider value={value}>{children}</GameDayContext.Provider>
}
