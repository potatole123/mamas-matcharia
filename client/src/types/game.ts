import type { Recipe as StoredRecipe } from '../../../server/src/models/recipe'
import type { Status } from '../../../server/src/types/enums'

export type Recipe = Omit<StoredRecipe, 'createdAt' | 'updatedAt'>

export type CustomerOrder = {
  orderId: number
  recipe: Recipe
  status: Status
}

export type Npc = {
  npcId: number
  order: CustomerOrder
}

export type ScheduledNpc = Npc & {
  orderNumber: number
}

export type GameDay = {
  level: number
  mode: 'singleplayer' | 'multiplayer'
  gameId: string
  seed: number
  targetScore: number
  npcCount: number
  npcFrequencySeconds: number
}

export type StartGameDayResponse = {
  day: GameDay
  npcs: Npc[]
}

export type Drink = {
  npcId: number
  orderId: number
  orderNumber: number
  recipe: Partial<Recipe>
  startTime: string
  endTime?: string
  measurements: Record<string, unknown>
}
