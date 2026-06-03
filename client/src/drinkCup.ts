import smallCup from './assets/base/small.png'
import largeCup from './assets/base/large.png'
import smallRegularIceCup from './assets/base/small_regular_ice.png'
import largeRegularIceCup from './assets/base/large_regular_ice.png'
import smallMilkCup from './assets/base/small_milk.png'
import largeMilkCup from './assets/base/large_milk.png'
import smallBaseDrink from './assets/topping/base_drink/small_base.png'
import largeBaseDrink from './assets/topping/base_drink/large_base.png'

export type DrinkSize = 'small' | 'large'

export type BaseCupSnapshot = {
  size: DrinkSize
  hasIce: boolean
  hasMilk: boolean
  hasBaseDrink?: boolean
}

const EMPTY_CUP_IMAGES: Record<DrinkSize, string> = {
  small: smallCup,
  large: largeCup,
}

const REGULAR_ICE_CUP_IMAGES: Record<DrinkSize, string> = {
  small: smallRegularIceCup,
  large: largeRegularIceCup,
}

const MILK_CUP_IMAGES: Record<DrinkSize, string> = {
  small: smallMilkCup,
  large: largeMilkCup,
}

const BASE_DRINK_IMAGES: Record<DrinkSize, string> = {
  small: smallBaseDrink,
  large: largeBaseDrink,
}

export function getCupPreviewSrc(cup: BaseCupSnapshot) {
  if (cup.hasBaseDrink) {
    return BASE_DRINK_IMAGES[cup.size]
  }
  if (cup.hasMilk) {
    return MILK_CUP_IMAGES[cup.size]
  }
  if (cup.hasIce) {
    return REGULAR_ICE_CUP_IMAGES[cup.size]
  }
  return EMPTY_CUP_IMAGES[cup.size]
}
