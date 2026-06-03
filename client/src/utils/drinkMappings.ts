import type { CreamTop, Matcha, Milk, Powder } from '../../../server/src/types/enums'
import type { MatchaTin } from '../stationProgress'

export type MilkCartonOption = 'whole' | 'oat' | 'soy' | 'almond'
export type ToppingCreamOption = 'matcha' | 'vanilla' | 'ube' | 'yuzu'
export type ToppingPowderOption = 'black-sesame' | 'hojicha' | 'kinako' | 'matcha'

export const MILK_CARTON_TO_RECIPE: Record<MilkCartonOption, Milk> = {
  whole: 'whole',
  oat: 'oat',
  soy: 'soy',
  almond: 'almond',
}

export const CREAM_UI_TO_RECIPE: Record<ToppingCreamOption, CreamTop> = {
  matcha: 'matcha',
  vanilla: 'vanilla',
  ube: 'ube',
  yuzu: 'yuzu',
}

export const POWDER_UI_TO_RECIPE: Record<ToppingPowderOption, Powder> = {
  'black-sesame': 'black sesame',
  hojicha: 'hojicha',
  kinako: 'kinako',
  matcha: 'matcha',
}

export const MATCHA_TIN_TO_GRADE: Record<MatchaTin, Matcha> = {
  1: 'regular',
  2: 'premium',
  3: 'super premium',
}

export const MATCHA_GRADE_TO_TIN: Record<Matcha, MatchaTin> = {
  regular: 1,
  premium: 2,
  'super premium': 3,
}

export function matchaGradeToTin(grade: Matcha): MatchaTin {
  return MATCHA_GRADE_TO_TIN[grade]
}
