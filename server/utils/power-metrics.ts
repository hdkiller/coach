export interface PowerSummaryMetrics {
  averageWatts: number
  maxWatts: number
  normalizedPower: number
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export function normalizeWattsStream(watts: unknown): number[] {
  if (!Array.isArray(watts)) return []
  const normalized: number[] = []
  for (const value of watts) {
    const parsed = toFiniteNumber(value)
    if (parsed === null) continue
    if (parsed < 0) continue
    normalized.push(parsed)
  }
  return normalized
}

export function calculateNormalizedPower(wattsArray: number[]): number {
  if (wattsArray.length < 30) {
    const avg = wattsArray.reduce((sum, w) => sum + w, 0) / wattsArray.length
    return avg
  }

  const rolling30s: number[] = []
  for (let i = 0; i <= wattsArray.length - 30; i++) {
    const avg30s = wattsArray.slice(i, i + 30).reduce((sum, w) => sum + w, 0) / 30
    rolling30s.push(avg30s)
  }

  const fourthPowerMean =
    rolling30s.reduce((sum, value) => sum + Math.pow(value, 4), 0) / rolling30s.length
  return Math.pow(fourthPowerMean, 0.25)
}

/**
 * Calculates a rolling 30s normalized power stream.
 * Returns an array of the same length as the input.
 */
export function calculateRollingNormalizedPower(wattsArray: number[]): number[] {
  if (wattsArray.length === 0) return []

  const result: number[] = new Array(wattsArray.length).fill(0)
  const windowSize = 30

  // For the first 30 seconds, use a simple expanding average or just the raw values
  let currentSum = 0
  for (let i = 0; i < Math.min(windowSize, wattsArray.length); i++) {
    currentSum += wattsArray[i] || 0
    result[i] = currentSum / (i + 1)
  }

  // For the rest, calculate 30s average, raise to 4th power, then take 4th root of rolling mean of those powers
  // To keep it efficient and return a stream of the same length,
  // we'll return the 30s average at each point, but weighted.
  // Real NP is a single number for a period, but "xPower" or "Rolling NP" is often used in charts.

  const powers: number[] = new Array(wattsArray.length).fill(0)
  let rollingSum = 0

  for (let i = 0; i < wattsArray.length; i++) {
    rollingSum += wattsArray[i] || 0
    if (i >= windowSize) {
      rollingSum -= wattsArray[i - windowSize] || 0
    }
    const avg30s = rollingSum / Math.min(i + 1, windowSize)
    powers[i] = Math.pow(avg30s, 4)
  }

  // Now smooth the powers with another window (optional but common for 'xPower')
  // or just return the 4th root of the 30s power
  for (let i = 0; i < wattsArray.length; i++) {
    result[i] = Math.pow(powers[i], 0.25)
  }

  return result
}

export function summarizePowerFromWatts(watts: unknown): PowerSummaryMetrics | null {
  const values = normalizeWattsStream(watts)
  if (values.length === 0) return null

  const avg = values.reduce((sum, w) => sum + w, 0) / values.length
  const max = values.reduce((currentMax, w) => Math.max(currentMax, w), 0)
  const np = calculateNormalizedPower(values)

  const averageWatts = Math.round(avg)
  const maxWatts = Math.round(max)
  const normalizedPower = Math.round(np)

  if (averageWatts <= 0 && maxWatts <= 0 && normalizedPower <= 0) {
    return null
  }

  return {
    averageWatts,
    maxWatts,
    normalizedPower
  }
}
