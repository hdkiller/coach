import { normalizeStressScoreForStorage } from './wellness'

export function normalizeSpO2Percentage(value: unknown): unknown {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return value
  }

  // Apple Health oxygen saturation can arrive as a fraction (e.g. 0.97 or 1.0).
  if (value >= 0 && value <= 1) {
    return Math.round(value * 1000) / 10
  }

  return value
}

export function normalizeWellnessFields<T extends Record<string, any>>(data: T): T {
  if (!data || typeof data !== 'object') return data

  const normalized: any = { ...data }

  if ('vo2Max' in normalized) {
    normalized.vo2max = normalized.vo2Max
    delete normalized.vo2Max
  }

  if ('spO2' in normalized) {
    normalized.spO2 = normalizeSpO2Percentage(normalized.spO2)
  }

  if ('stress' in normalized) {
    normalized.stress = normalizeStressScoreForStorage(normalized.stress)
  }

  // Calorie fields are stored as integers, but some clients may send
  // decimal values. Accept them and normalize to the nearest kcal.
  for (const key of [
    'restingCaloriesBurned',
    'activeCaloriesBurned',
    'totalCaloriesBurned'
  ] as const) {
    if (typeof normalized[key] === 'number' && Number.isFinite(normalized[key])) {
      normalized[key] = Math.round(normalized[key])
    }
  }

  return normalized as T
}
