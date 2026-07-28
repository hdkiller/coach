/**
 * Nutrition Absorption Utilities
 * Implements Glycemic Response Modeling using Ra (Rate of Appearance) curves.
 *
 * Each profile is a Gamma curve defined by `delay` (minutes before anything appears), `peak` (the
 * mode, measured from the end of the delay) and `k` (shape). `duration` is descriptive only - the
 * curve has no hard end, and by the stated duration roughly 75-95% of the meal has appeared.
 */

export const ABSORPTION_PROFILES = {
  RAPID: {
    id: 'RAPID' as const,
    label: 'Rapid (Gels/Liquids)',
    delay: 5,
    peak: 15, // Total 20 min from consumption
    duration: 45,
    k: 2
  },
  FAST: {
    id: 'FAST' as const,
    label: 'Fast (Fruit/White Bread)',
    delay: 10,
    peak: 30, // Total 40 min from consumption
    duration: 90,
    k: 3
  },
  BALANCED: {
    id: 'BALANCED' as const,
    label: 'Balanced (Oats/Pasta)',
    delay: 30,
    peak: 60, // Total 90 min from consumption
    duration: 180,
    k: 3
  },
  DENSE: {
    id: 'DENSE' as const,
    label: 'Dense (Protein/Fats/Fiber)',
    delay: 45,
    peak: 120, // Total 165 min from consumption
    duration: 300,
    k: 4
  },
  HYPER_LOAD: {
    id: 'HYPER_LOAD' as const,
    label: 'Hyper-Load (Large Meal)',
    delay: 60,
    peak: 180, // Total 240 min from consumption
    duration: 480,
    k: 5
  }
}

export type AbsorptionType = keyof typeof ABSORPTION_PROFILES
export type AbsorptionProfile = (typeof ABSORPTION_PROFILES)[AbsorptionType]

/**
 * Calculates the Rate of Appearance (Ra) for a given time since consumption.
 * Uses a Gamma distribution-like curve: Ra(t) = (t^k-1 * e^-t/theta) / (theta^k * (k-1)!)
 * @param minsSince Time in minutes since the meal was consumed
 * @param amount Total grams of carbs in the meal
 * @param profile Absorption profile to use
 * @returns Rate of appearance in grams per minute
 */
export function getRa(minsSince: number, amount: number, profile: AbsorptionProfile): number {
  const t = minsSince - profile.delay
  if (t <= 0) return 0

  // theta = peak / (k - 1)
  const theta = profile.peak / (profile.k - 1)

  // Normalized Gamma distribution Ra(t)
  // We want the integral from 0 to infinity to be 'amount'
  // Integral[t^(k-1) * e^(-t/theta)] = Gamma(k) * theta^k

  const power = profile.k - 1
  const numerator = Math.pow(t, power) * Math.exp(-t / theta)

  // Factorial for integer k: (k-1)!
  const factorial = (n: number): number => {
    let res = 1
    for (let i = 2; i <= n; i++) res *= i
    return res
  }

  const denominator = Math.pow(theta, profile.k) * factorial(power)

  return (amount * numerator) / denominator
}

/**
 * Fraction of a meal that has appeared in circulation by `minsSince`.
 *
 * This is the cumulative distribution of the same Gamma curve `getRa` describes. For integer shape
 * k it has a closed form:
 *
 *   F(x) = 1 - e^(-x/theta) * sum_{i=0}^{k-1} (x/theta)^i / i!
 *
 * Every profile uses an integer k, so this is exact rather than approximated.
 */
export function getAbsorbedFraction(minsSince: number, profile: AbsorptionProfile): number {
  const x = minsSince - profile.delay
  if (!Number.isFinite(x) || x <= 0) return 0

  const theta = profile.peak / (profile.k - 1)
  if (!(theta > 0)) return 0

  const z = x / theta
  let term = 1
  let sum = 1
  for (let i = 1; i < profile.k; i++) {
    term *= z / i
    sum += term
  }

  const fraction = 1 - Math.exp(-z) * sum
  return Math.min(1, Math.max(0, fraction))
}

/**
 * Calculates total grams absorbed in a specific interval [t1, t2].
 *
 * Evaluated as the difference of two cumulative fractions. The previous implementation sampled the
 * rate at the interval midpoint and multiplied by the full width, which was only defensible for
 * short steps: callers passing the whole elapsed span (`0` to `minsSince`) got a figure that rose
 * above the meal's own carbohydrate content and then fell back toward zero as the rate tailed off.
 */
export function getAbsorbedInInterval(
  t1: number,
  t2: number,
  amount: number,
  profile: AbsorptionProfile
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  if (!Number.isFinite(t1) || !Number.isFinite(t2) || t2 <= t1) return 0

  const from = getAbsorbedFraction(t1, profile)
  const to = getAbsorbedFraction(t2, profile)

  return Math.max(0, amount * (to - from))
}

/**
 * Maps a food item to its absorption profile.
 * Defaults to BALANCED (the middle value) when no specific type is known.
 */
export function getProfileForItem(_itemName?: string, absorptionType?: string): AbsorptionProfile {
  const type = String(absorptionType || "").toUpperCase();
  if (type && type in ABSORPTION_PROFILES) {
    return ABSORPTION_PROFILES[type as keyof typeof ABSORPTION_PROFILES];
  }
  // Default to BALANCED for generic meals.
  // We no longer rely on string keyword matching for absorption rates.
  return ABSORPTION_PROFILES.BALANCED
}
