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
