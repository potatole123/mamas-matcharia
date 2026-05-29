export const CUP_SIZES = ['large', 'small'] as const
export const TEMPS = ['hot', 'iced'] as const
export const ICE_LEVELS = ['none', 'light', 'regular'] as const
export const MATCHA_TYPES = ['regular', 'premium', 'super premium'] as const
export const MILK_TYPES = ['whole', 'oat', 'soy', 'almond', 'none'] as const
export const FLAVOR_TYPES = ['strawberry', 'mango', 'pandan', 'none'] as const
export const SWEETENER_TYPES = ['honey', 'agave', 'equal', 'none'] as const
export const SWEETNESS_LEVELS = ['none', 'less', 'perfect', 'extra'] as const
export const CREAM_TOP_TYPES = ['matcha', 'ube', 'vanilla', 'yuzu', 'none'] as const
export const POWDER_TYPES = ['matcha', 'hojicha', 'kinako', 'black sesame', 'none'] as const

export type CupSize = (typeof CUP_SIZES)[number]
export type Temp = (typeof TEMPS)[number]
export type IceLevel = (typeof ICE_LEVELS)[number]
export type Matcha = (typeof MATCHA_TYPES)[number]
export type Milk = (typeof MILK_TYPES)[number]
export type Flavor = (typeof FLAVOR_TYPES)[number]
export type Sweetener = (typeof SWEETENER_TYPES)[number]
export type SweetnessLevel = (typeof SWEETNESS_LEVELS)[number]
export type CreamTop = (typeof CREAM_TOP_TYPES)[number]
export type Powder = (typeof POWDER_TYPES)[number]

export type Recipe = {
  recipeId: string
  cupSize: CupSize
  temp: Temp
  iceLevel: IceLevel
  matcha: Matcha
  milk: Milk
  flavor: Flavor
  sweetener: Sweetener
  sweetnessLevel: SweetnessLevel
  creamTop: CreamTop
  powder: Powder
}
