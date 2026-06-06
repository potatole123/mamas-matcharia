import type { RecipeSet } from "./models/recipeSet"
import {
  CREAM_TOP,
  CUP_SIZE,
  FLAVOR,
  ICE_LEVEL,
  MATCHA,
  MILK,
  POWDER,
  SWEETENER,
  SWEETNESS_LEVEL,
  TEMP,
} from "./types/enums"

export type RecipeSetInput = Partial<
  Pick<
    RecipeSet,
    | "cupSizeSet"
    | "tempSet"
    | "iceLevelSet"
    | "matchaSet"
    | "milkSet"
    | "flavorSet"
    | "sweetenerSet"
    | "sweetnessLevelSet"
    | "creamTopSet"
    | "powderSet"
  >
>

export type LevelConfig = {
  level: number
  targetScore: number
  npcCount: number
  npcFrequencySeconds: number
  recipeSet: RecipeSetInput
}

const PASSING_POINTS_PER_ORDER = 11

const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 1,
    targetScore: 4 * PASSING_POINTS_PER_ORDER,
    npcCount: 4,
    npcFrequencySeconds: 30,
    recipeSet: {
      cupSizeSet: ["small"],
      tempSet: ["iced"],
      iceLevelSet: ["regular"],
      matchaSet: ["regular"],
      milkSet: ["whole", "oat"],
      flavorSet: ["none"],
      sweetenerSet: ["none", "honey"],
      sweetnessLevelSet: ["perfect"],
      creamTopSet: ["none"],
      powderSet: ["none"],
    },
  },
  {
    level: 2,
    targetScore: 5 * PASSING_POINTS_PER_ORDER,
    npcCount: 5,
    npcFrequencySeconds: 25,
    recipeSet: {
      cupSizeSet: ["small", "large"],
      tempSet: ["hot", "iced"],
      iceLevelSet: ["none", "regular"],
      matchaSet: ["regular", "premium"],
      milkSet: ["whole", "oat", "soy"],
      flavorSet: ["none", "strawberry", "mango"],
      sweetenerSet: ["none", "honey", "agave"],
      sweetnessLevelSet: ["less", "perfect"],
      creamTopSet: ["none", "vanilla"],
      powderSet: ["none", "matcha"],
    },
  },
  {
    level: 3,
    targetScore: 7 * PASSING_POINTS_PER_ORDER,
    npcCount: 7,
    npcFrequencySeconds: 20,
    recipeSet: {
      cupSizeSet: ["small", "large"],
      tempSet: ["hot", "iced"],
      iceLevelSet: ["none", "light", "regular"],
      matchaSet: ["regular", "premium", "ultra"],
      milkSet: ["whole", "oat", "soy", "almond"],
      flavorSet: ["none", "strawberry", "mango", "pandan"],
      sweetenerSet: ["none", "honey", "agave", "equal"],
      sweetnessLevelSet: ["none", "less", "perfect", "extra"],
      creamTopSet: ["none", "matcha", "ube", "vanilla"],
      powderSet: ["none", "matcha", "hojicha"],
    },
  },
  {
    level: 4,
    targetScore: 9 * PASSING_POINTS_PER_ORDER,
    npcCount: 9,
    npcFrequencySeconds: 15,
    recipeSet: {
      cupSizeSet: ["small", "large"],
      tempSet: ["hot", "iced"],
      iceLevelSet: ["none", "light", "regular"],
      matchaSet: ["regular", "premium", "ultra"],
      milkSet: ["whole", "oat", "soy", "almond"],
      flavorSet: ["none", "strawberry", "mango", "pandan"],
      sweetenerSet: ["none", "honey", "agave", "equal"],
      sweetnessLevelSet: ["none", "less", "perfect", "extra"],
      creamTopSet: ["none", "matcha", "ube", "vanilla", "yuzu"],
      powderSet: ["none", "matcha", "hojicha", "kinako"],
    },
  },
  {
    level: 5,
    targetScore: 11 * PASSING_POINTS_PER_ORDER,
    npcCount: 11,
    npcFrequencySeconds: 10,
    recipeSet: {
      cupSizeSet: ["small", "large"],
      tempSet: ["hot", "iced"],
      iceLevelSet: ["none", "light", "regular"],
      matchaSet: ["regular", "premium", "ultra"],
      milkSet: ["whole", "oat", "soy", "almond"],
      flavorSet: ["none", "strawberry", "mango", "pandan"],
      sweetenerSet: ["none", "honey", "agave", "equal"],
      sweetnessLevelSet: ["none", "less", "perfect", "extra"],
      creamTopSet: ["none", "matcha", "ube", "vanilla", "yuzu"],
      powderSet: ["none", "matcha", "hojicha", "kinako", "black sesame"],
    },
  },
]

export function getLevelConfig(level: number): LevelConfig {
  const configuredLevel = LEVEL_CONFIGS.find((config) => config.level === level)

  if (configuredLevel) {
    return {
      ...configuredLevel,
      targetScore: configuredLevel.npcCount * PASSING_POINTS_PER_ORDER,
    }
  }

  const npcCount = Math.min(20, 13 + (level - 5) * 2)
  return {
    level,
    targetScore: npcCount * PASSING_POINTS_PER_ORDER,
    npcCount,
    npcFrequencySeconds: Math.max(15, 20 - (level - 5) * 5),
    recipeSet: {},
  }
}

export function getRecipeSetForUnlockedLevel(level: number) {
  return getLevelConfig(level).recipeSet
}

export function buildRecipeSetForUnlockedLevel(level: number) {
  return {
    ...buildFullRecipeSet(),
    ...getRecipeSetForUnlockedLevel(level),
  }
}

export function buildFullRecipeSet() {
  return {
    cupSizeSet: [...CUP_SIZE],
    tempSet: [...TEMP],
    iceLevelSet: [...ICE_LEVEL],
    matchaSet: [...MATCHA],
    milkSet: [...MILK],
    flavorSet: [...FLAVOR],
    sweetenerSet: [...SWEETENER],
    sweetnessLevelSet: [...SWEETNESS_LEVEL],
    creamTopSet: [...CREAM_TOP],
    powderSet: [...POWDER],
  }
}
