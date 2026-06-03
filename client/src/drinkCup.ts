import smallCup from './assets/base/small.png'
import largeCup from './assets/base/large.png'
import smallLightIceCup from './assets/base/small_light_ice.png'
import largeLightIceCup from './assets/base/large_light_ice.png'
import smallRegularIceCup from './assets/base/small_regular_ice.png'
import largeRegularIceCup from './assets/base/large_regular_ice.png'
import smallMilkCup from './assets/base/small_milk.png'
import largeMilkCup from './assets/base/large_milk.png'
import smallBaseDrink from './assets/topping/base_drink/small_base.png'
import largeBaseDrink from './assets/topping/base_drink/large_base.png'
import type { IceLevel } from '../../server/src/types/enums'

export type DrinkSize = 'small' | 'large'

export type BaseCupSnapshot = {
  size: DrinkSize
  /** none = empty cup; light / regular use ice cup art */
  iceLevel: IceLevel
  hasMilk: boolean
  hasBaseDrink?: boolean
}

const EMPTY_CUP_IMAGES: Record<DrinkSize, string> = {
  small: smallCup,
  large: largeCup,
}

const ICE_CUP_IMAGES: Record<IceLevel, Record<DrinkSize, string | null>> = {
  none: { small: null, large: null },
  light: { small: smallLightIceCup, large: largeLightIceCup },
  regular: { small: smallRegularIceCup, large: largeRegularIceCup },
}

const MILK_CUP_IMAGES: Record<DrinkSize, string> = {
  small: smallMilkCup,
  large: largeMilkCup,
}

const BASE_DRINK_IMAGES: Record<DrinkSize, string> = {
  small: smallBaseDrink,
  large: largeBaseDrink,
}

export function cupHasIce(iceLevel: IceLevel) {
  return iceLevel === 'light' || iceLevel === 'regular'
}

export function getCupPreviewSrc(cup: BaseCupSnapshot) {
  if (cup.hasBaseDrink) {
    return BASE_DRINK_IMAGES[cup.size]
  }
  if (cup.hasMilk) {
    return MILK_CUP_IMAGES[cup.size]
  }
  const iceImage = ICE_CUP_IMAGES[cup.iceLevel][cup.size]
  if (iceImage) {
    return iceImage
  }
  return EMPTY_CUP_IMAGES[cup.size]
}
