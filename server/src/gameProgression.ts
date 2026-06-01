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
  recipeSet: RecipeSetInput
}

const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 1,
    targetScore: 300,
    npcCount: 4,
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
    targetScore: 500,
    npcCount: 5,
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
    targetScore: 750,
    npcCount: 7,
    recipeSet: {
      cupSizeSet: ["small", "large"],
      tempSet: ["hot", "iced"],
      iceLevelSet: ["none", "light", "regular"],
      matchaSet: ["regular", "premium", "super premium"],
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
    targetScore: 1000,
    npcCount: 9,
    recipeSet: {
      cupSizeSet: ["small", "large"],
      tempSet: ["hot", "iced"],
      iceLevelSet: ["none", "light", "regular"],
      matchaSet: ["regular", "premium", "super premium"],
      milkSet: ["whole", "oat", "soy", "almond", "none"],
      flavorSet: ["none", "strawberry", "mango", "pandan"],
      sweetenerSet: ["none", "honey", "agave", "equal"],
      sweetnessLevelSet: ["none", "less", "perfect", "extra"],
      creamTopSet: ["none", "matcha", "ube", "vanilla", "yuzu"],
      powderSet: ["none", "matcha", "hojicha", "kinako"],
    },
  },
  {
    level: 5,
    targetScore: 1250,
    npcCount: 11,
    recipeSet: {
      cupSizeSet: ["small", "large"],
      tempSet: ["hot", "iced"],
      iceLevelSet: ["none", "light", "regular"],
      matchaSet: ["regular", "premium", "super premium"],
      milkSet: ["whole", "oat", "soy", "almond", "none"],
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
    return configuredLevel
  }

  return {
    level,
    targetScore: 1250 + (level - 5) * 250,
    npcCount: Math.min(20, 13 + (level - 5) * 2),
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
