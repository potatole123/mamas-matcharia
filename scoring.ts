/** Drink the customer ordered vs what the player made (same 10 fields). */
export type DrinkRecipe = {
  cupSize: string;
  temp: string;
  iceLevel: string;
  matcha: string;
  milk: string;
  flavor: string;
  sweetener: string;
  sweetnessLevel: string;
  creamTop: string;
  powder: string;
};

export type OrderScoreResult = {
  waitingScore: number;
  accuracyScore: number;
  measurementScore: number;
  toppingScore: number;
  totalScore: number;
  tipsEarned: number;
};

const ACCURACY_FIELDS = [
  "cupSize",
  "temp",
  "iceLevel",
  "milk",
  "flavor",
  "sweetener",
] as const;

const MEASUREMENT_FIELDS = ["matcha", "sweetnessLevel"] as const;
const TOPPING_FIELDS = ["creamTop", "powder"] as const;

const MAX_WAITING = 10;
const TIP_RATE = 0.5;
const LATE_DECAY = 0.15;

function countMatches(
  target: DrinkRecipe,
  made: DrinkRecipe,
  fields: readonly (keyof DrinkRecipe)[],
): number {
  return fields.filter((field) => target[field] === made[field]).length;
}

/**
 * Call when the player serves the drink at pickup.
 */
export function calculateScore(
  target: DrinkRecipe,
  made: DrinkRecipe,
  orderCreatedAt: Date,
  expirationTime: Date,
  servedAt: Date,
): OrderScoreResult {
  const accuracyScore = countMatches(target, made, ACCURACY_FIELDS);
  const measurementScore = countMatches(target, made, MEASUREMENT_FIELDS);
  const toppingScore = countMatches(target, made, TOPPING_FIELDS);

  const servedMs = servedAt.getTime();
  const expireMs = expirationTime.getTime();
  let waitingScore = MAX_WAITING;

  if (servedMs > expireMs) {
    const secondsLate = (servedMs - expireMs) / 1000;
    waitingScore = Math.max(
      0,
      Math.round(MAX_WAITING * Math.exp(-LATE_DECAY * secondsLate)),
    );
  }

  const totalScore =
    accuracyScore + measurementScore + toppingScore + waitingScore;
  const tipsEarned = Math.round(totalScore * TIP_RATE * 100) / 100;

  return {
    waitingScore,
    accuracyScore,
    measurementScore,
    toppingScore,
    totalScore,
    tipsEarned,
  };
}
