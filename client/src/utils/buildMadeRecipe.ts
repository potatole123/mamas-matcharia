import type { InProgressDrink, PlayerDrinkRecipe } from '../types/playerDrink'
import type { DrinkOrderSubmission, MadeRecipe } from '../types/drinkSubmission'
import type { TicketData } from '../hooks/useOrderTickets'

const RECIPE_DEFAULTS: Required<
  Omit<PlayerDrinkRecipe, 'cupSize' | 'temp' | 'iceLevel' | 'matcha' | 'milk'>
> = {
  flavor: 'none',
  sweetener: 'none',
  sweetnessLevel: 'none',
  creamTop: 'none',
  powder: 'none',
}

/**
 * Normalize the player's partial recipe into a full Recipe-shaped object for scoring.
 * Unset optional steps (e.g. milk, matcha) stay undefined on the drink until the player
 * performs them; scoring compares strings and will treat missing fields as mismatches.
 */
export function buildMadeRecipe(drink: InProgressDrink): MadeRecipe {
  const { recipe } = drink
  if (!recipe.cupSize) {
    throw new Error('Drink is missing cupSize')
  }

  const made: MadeRecipe = {
    cupSize: recipe.cupSize,
    temp: recipe.temp ?? 'hot',
    iceLevel: recipe.iceLevel ?? 'none',
    flavor: recipe.flavor ?? RECIPE_DEFAULTS.flavor,
    sweetener: recipe.sweetener ?? RECIPE_DEFAULTS.sweetener,
    sweetnessLevel: recipe.sweetnessLevel ?? RECIPE_DEFAULTS.sweetnessLevel,
    creamTop: recipe.creamTop ?? RECIPE_DEFAULTS.creamTop,
    powder: recipe.powder ?? RECIPE_DEFAULTS.powder,
  }

  if (recipe.matcha) {
    made.matcha = recipe.matcha
  }
  if (recipe.milk) {
    made.milk = recipe.milk
  }

  return made
}

export function createDrinkOrderSubmission(
  drink: InProgressDrink,
  ticket: TicketData,
  servedAt: Date = new Date(),
): DrinkOrderSubmission {
  return {
    drinkId: drink.id,
    orderId: ticket.orderId,
    orderNumber: ticket.orderNumber,
    servedAt: servedAt.toISOString(),
    targetRecipe: ticket.recipe,
    madeRecipe: buildMadeRecipe(drink),
    drink: {
      ...drink,
      status: 'served',
      station: 'served',
    },
  }
}
