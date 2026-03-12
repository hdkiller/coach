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

  const normalized = { ...data }

  if ('vo2Max' in normalized && !('vo2max' in normalized)) {
    normalized.vo2max = normalized.vo2Max
  }

  delete normalized.vo2Max

  if ('spO2' in normalized) {
    normalized.spO2 = normalizeSpO2Percentage(normalized.spO2)
  }

  return normalized as T
}
