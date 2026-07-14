export const PASSIVE_REHYDRATION_START_HOUR = 7
export const PASSIVE_REHYDRATION_END_HOUR = 21
export const PASSIVE_REHYDRATION_ML_PER_HOUR = 200
export const NO_EXERCISE_DEBT_DECAY_ML_PER_HOUR = 100
export const MEAL_LINKED_WATER_ML = 400
export const HYDRATION_DEBT_FLUSH_THRESHOLD_ML = 3000
export const HYDRATION_DEBT_NUDGE_THRESHOLD_ML = 2000
export const INTRA_WORKOUT_TARGET_ML_PER_HOUR = 700

export type HydrationRingStatus = 'green' | 'yellow' | 'red'

export function getHydrationRingStatus(hydrationDebtMl: number): HydrationRingStatus {
  if (hydrationDebtMl > 1500) return 'red'
  if (hydrationDebtMl > 500) return 'yellow'
  return 'green'
}

export type HydrationAdviceLevel = 'optimal' | 'moderate' | 'high' | 'severe'

/** Returns the hydration advice tier — higher debt maps to more urgent tiers. */
export function getHydrationAdviceLevel(debtMl: number): HydrationAdviceLevel {
  if (debtMl > HYDRATION_DEBT_NUDGE_THRESHOLD_ML) return 'severe'
  if (debtMl > 1500) return 'high'
  if (debtMl > 500) return 'moderate'
  return 'optimal'
}

/** Server-side strategy summary fragment for hydration debt. */
export function getHydrationAdviceSummary(debtMl: number): string | null {
  const level = getHydrationAdviceLevel(debtMl)
  if (level === 'severe') {
    return ` WARNING: You are carrying a significant fluid debt of ${Math.round(debtMl)}ml. Prioritize rehydration today.`
  }
  if (level === 'high') {
    return ' High fluid debt detected. Add 500ml of water to your next two meals to normalize.'
  }
  if (debtMl > 1000) {
    return ` Moderate fluid debt of ${Math.round(debtMl)}ml. Increase intake today.`
  }
  return null
}

const FLUID_KEYWORDS = [
  'water',
  'coffee',
  'espresso',
  'tea',
  'matcha',
  'latte',
  'cappuccino',
  'americano',
  'juice',
  'milk',
  'smoothie',
  'electrolyte',
  'sports drink',
  'drink',
  'bottle',
  'flask',
  'cup',
  'glass',
  'sip'
]

const OUNCE_TO_ML = 29.5735

function inferContainerMl(container: string): number {
  const normalized = container.toLowerCase()
  if (normalized.includes('large')) return 500
  if (normalized.includes('medium')) return 350
  if (normalized.includes('small')) return 250
  if (normalized.includes('bottle')) return 500
  if (normalized.includes('glass')) return 250
  if (normalized.includes('cup')) return 240
  return 0
}

export function extractFluidIntakeMl(text: string): number {
  if (!text || typeof text !== 'string') return 0
  const lower = text.toLowerCase()
  const hasFluidKeyword = FLUID_KEYWORDS.some((keyword) => lower.includes(keyword))
  if (!hasFluidKeyword) return 0

  let totalMl = 0
  let hasExplicitVolume = false
  const explicitVolumePattern =
    /(\d+(?:\.\d+)?)\s*(ml|milliliters?|millilitres?|l|liters?|litres?|oz|fl\s?oz)\b/gi
  for (const match of Array.from(lower.matchAll(explicitVolumePattern))) {
    const value = Number(match[1] || 0)
    const unit = (match[2] || '').toLowerCase()
    if (!value) continue
    hasExplicitVolume = true
    if (unit === 'ml' || unit.startsWith('millil')) totalMl += value
    else if (unit === 'l' || unit.startsWith('liter') || unit.startsWith('litre'))
      totalMl += value * 1000
    else totalMl += value * OUNCE_TO_ML
  }

  // If the user already gave an explicit volume ("500ml bottle"), don't also add a
  // container estimate (which would double count).
  if (!hasExplicitVolume) {
    const containerPattern = /\b(large|medium|small)?\s*(bottle|glass|cup|flask)\b/gi
    for (const match of Array.from(lower.matchAll(containerPattern))) {
      const descriptor = `${match[1] || ''} ${match[2] || ''}`.trim()
      totalMl += inferContainerMl(descriptor)
    }
  }

  return Math.round(totalMl)
}
