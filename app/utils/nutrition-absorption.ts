/**
 * Nutrition Absorption Utilities
 * Implements Glycemic Response Modeling using Ra (Rate of Appearance) curves.
 */

export const ABSORPTION_PROFILES = {
  SIMPLE: {
    id: 'SIMPLE' as const,
    label: 'Simple (Gels/Liquids)',
    delay: 5,
    peak: 15, // Total 20 min from consumption
    duration: 60,
    k: 2
  },
  INTERMEDIATE: {
    id: 'INTERMEDIATE' as const,
    label: 'Intermediate (Fruit/Bars)',
    delay: 15,
    peak: 35, // Total 50 min from consumption
    duration: 120,
    k: 3
  },
  COMPLEX: {
    id: 'COMPLEX' as const,
    label: 'Complex (Full Meals)',
    delay: 45,
    peak: 60, // Total 105 min from consumption
    duration: 300,
    k: 4
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
 * Calculates total grams absorbed in a specific interval [t1, t2]
 */
export function getAbsorbedInInterval(
  t1: number,
  t2: number,
  amount: number,
  profile: AbsorptionProfile
): number {
  if (t2 <= profile.delay) return 0

  // For a 15 min interval, we can approximate by sampling at the midpoint
  // or by using the average of start and end
  const mid = (Math.max(t1, profile.delay) + t2) / 2
  const ra = getRa(mid, amount, profile)

  return ra * (t2 - t1)
}

/**
 * Maps a food item to its absorption profile
 */
export function getProfileForItem(itemName: string): AbsorptionProfile {
  const name = itemName.toLowerCase()

  if (
    name.includes('gel') ||
    name.includes('liquid') ||
    name.includes('drink') ||
    name.includes('juice') ||
    name.includes('honey') ||
    name.includes('sugar')
  ) {
    return ABSORPTION_PROFILES.SIMPLE
  }

  if (
    name.includes('fruit') ||
    name.includes('banana') ||
    name.includes('bar') ||
    name.includes('oats') ||
    name.includes('bread') ||
    name.includes('rice')
  ) {
    return ABSORPTION_PROFILES.INTERMEDIATE
  }

  return ABSORPTION_PROFILES.COMPLEX
}
