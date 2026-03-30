export function getMoodLabel(score: number | null | undefined): string {
  if (score === null || score === undefined || score === 0) return 'N/A'
  if (score >= 8) return 'Great'
  if (score >= 6) return 'Good'
  if (score >= 4) return 'OK'
  return 'Grumpy'
}

export function normalizeStressScore(score: number | null | undefined): number | null {
  if (score === null || score === undefined) return null
  if (score > 10) return Math.max(0, Math.min(10, Math.round(score) / 10))
  return score
}

export function normalizeStressScoreForStorage(score: number | null | undefined): number | null {
  const normalized = normalizeStressScore(score)
  if (normalized === null) return null
  return Math.round(normalized)
}

export function getStressLabel(score: number | null | undefined): string {
  score = normalizeStressScore(score)
  if (score === null || score === undefined || score === 0) return 'N/A'
  if (score >= 8) return 'Extreme'
  if (score >= 6) return 'High'
  if (score >= 4) return 'Average'
  return 'Low'
}

export function getSorenessLabel(score: number | null | undefined): string {
  if (score === null || score === undefined || score === 0) return 'N/A'
  if (score >= 8) return 'Extreme'
  if (score >= 6) return 'High'
  if (score >= 4) return 'Average'
  return 'Low'
}

export function getFatigueLabel(score: number | null | undefined): string {
  if (score === null || score === undefined || score === 0) return 'N/A'
  if (score >= 8) return 'Extreme'
  if (score >= 6) return 'High'
  if (score >= 4) return 'Average'
  return 'Low'
}

export function getMotivationLabel(score: number | null | undefined): string {
  if (score === null || score === undefined || score === 0) return 'N/A'
  if (score >= 8) return 'Extreme'
  if (score >= 6) return 'High'
  if (score >= 4) return 'Average'
  return 'Low'
}

export function getHydrationLabel(val: string | number | null | undefined): string {
  const score = typeof val === 'string' ? parseInt(val) : val
  if (!score) return ''
  const map: Record<number, string> = {
    1: 'Good',
    2: 'OK',
    3: 'Poor',
    4: 'Bad'
  }
  return map[score] || ''
}

export function getInjuryLabel(val: string | number | null | undefined): string {
  const score = typeof val === 'string' ? parseInt(val) : val
  if (!score) return ''
  const map: Record<number, string> = {
    1: 'None',
    2: 'Niggle',
    3: 'Poor',
    4: 'Injured'
  }
  return map[score] || ''
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function mapIntervalsStressValue(value: unknown): number | null {
  const numericValue = toFiniteNumber(value)
  if (numericValue !== null) {
    if (numericValue >= 1 && numericValue <= 4) {
      const map: Record<number, number> = { 1: 1, 2: 4, 3: 7, 4: 10 }
      return map[Math.round(numericValue)] || null
    }

    return normalizeStressScoreForStorage(numericValue)
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    const map: Record<string, number> = {
      low: 1,
      average: 4,
      avg: 4,
      medium: 4,
      moderate: 4,
      high: 7,
      extreme: 10,
      very_high: 10,
      veryhigh: 10
    }

    return map[normalized] ?? null
  }

  return null
}

export function normalizeReadinessScore(score: number | undefined | null): number | null {
  if (score === undefined || score === null) return null
  if (score <= 10) return score
  return Math.round((score / 100) * 10)
}

export function getWellnessDisplayColor(value: number, type: 'hrv' | 'rhr' | 'readiness') {
  if (type === 'readiness') {
    if (value >= 8) return 'text-green-500'
    if (value >= 6) return 'text-amber-500'
    return 'text-red-500'
  }

  return 'text-gray-500'
}

export function getWellnessTrendIcon(current: number, previous: number) {
  if (current > previous) return 'i-heroicons-arrow-trending-up'
  if (current < previous) return 'i-heroicons-arrow-trending-down'
  return 'i-heroicons-minus'
}

export function formatWellnessValue(value: number | null, type: string) {
  if (value === null) return '--'
  if (type === 'hrv') return `${Math.round(value)} ms`
  if (type === 'rhr') return `${Math.round(value)} bpm`
  if (type === 'weight') return `${value.toFixed(1)} kg`
  return value.toString()
}

export function normalizeWellnessTags(tags: any): string | null {
  if (!tags) return null
  if (typeof tags === 'string') return tags
  if (Array.isArray(tags)) return tags.join(', ')
  return null
}

export function mapWellnessCategory(category: string): string | null {
  const map: Record<string, string> = {
    sleep: 'sleep',
    readiness: 'readiness',
    recovery: 'readiness',
    activity: 'activity',
    stress: 'stress',
    workout: 'activity'
  }

  const normalized = category.toLowerCase()
  for (const [key, value] of Object.entries(map)) {
    if (normalized.includes(key)) return value
  }

  return null
}

export function normalizeInjuryStatus(status: any): string | null {
  if (!status) return null
  const normalized = String(status).toLowerCase()
  if (normalized.includes('injured')) return 'INJURED'
  if (normalized.includes('sick')) return 'SICK'
  if (normalized.includes('normal')) return 'HEALTHY'
  return null
}

export function mapWellnessMood(mood: any): number | null {
  if (!mood) return null
  if (typeof mood === 'number') return mood

  const normalized = String(mood).toLowerCase()
  const map: Record<string, number> = {
    great: 5,
    good: 4,
    normal: 3,
    poor: 2,
    bad: 1
  }

  for (const [key, value] of Object.entries(map)) {
    if (normalized.includes(key)) return value
  }

  return null
}

export function normalizeWellnessStress(stress: any): number | null {
  if (stress === null || stress === undefined) return null
  if (typeof stress === 'number') {
    if (stress > 10) return Math.min(100, Math.max(1, Math.round(stress)))
    return Math.min(100, Math.max(1, Math.round(stress * 10)))
  }

  const normalized = String(stress).toLowerCase()
  const map: Record<string, number> = {
    high: 90,
    moderate: 60,
    medium: 60,
    low: 30,
    none: 10,
    rest: 10
  }

  for (const [key, value] of Object.entries(map)) {
    if (normalized.includes(key)) return value
  }

  return null
}

export function getCanonicalWellnessStress(
  wellness:
    | {
        stress?: number | null
        lastSource?: string | null
        rawJson?: any | null
      }
    | null
    | undefined
): number | null {
  if (!wellness) return null

  const source = `${wellness.lastSource || ''}`.toLowerCase()
  const raw = wellness.rawJson
  const nonSubjectiveSources = new Set([
    'garmin',
    'oura',
    'whoop',
    'fitbit',
    'ultrahuman',
    'polar',
    'withings'
  ])

  if (raw && typeof raw === 'object') {
    if (source === 'intervals') {
      const intervalsStress = mapIntervalsStressValue(raw.stress)
      if (intervalsStress !== null) return intervalsStress
      if (raw.stress == null) return null
    }
  }

  if (nonSubjectiveSources.has(source)) return null

  return normalizeStressScoreForStorage(wellness.stress)
}

export interface FitbitRecoveryAlertInput {
  lastSource?: string | null
  hrv?: number | null
  sleepHours?: number | null
  sleepQuality?: number | null
  sleepScore?: number | null
  atl?: number | null
  recentHrvValues?: Array<number | null | undefined>
}

export interface FitbitRecoveryAlertResult {
  isFitbit: boolean
  lowHrv: boolean
  poorSleep: boolean
  highAtl: boolean
  triggered: boolean
  baselineHrv: number | null
  summary: string
}

export function evaluateFitbitRecoveryAlert(
  input: FitbitRecoveryAlertInput
): FitbitRecoveryAlertResult {
  const source = `${input.lastSource || ''}`.toLowerCase()
  const isFitbit = source === 'fitbit'

  const currentHrv = toFiniteNumber(input.hrv)
  const sleepHours = toFiniteNumber(input.sleepHours)
  const sleepQuality = toFiniteNumber(input.sleepQuality)
  const sleepScore = toFiniteNumber(input.sleepScore)
  const atl = toFiniteNumber(input.atl)

  const recentHrvValues = (input.recentHrvValues || [])
    .map((value) => toFiniteNumber(value))
    .filter((value): value is number => value !== null)

  const baselineHrv =
    recentHrvValues.length >= 5
      ? recentHrvValues.reduce((sum, value) => sum + value, 0) / recentHrvValues.length
      : null

  const lowHrv =
    currentHrv !== null &&
    ((baselineHrv !== null && currentHrv < baselineHrv * 0.85) ||
      (baselineHrv === null && currentHrv < 35))

  const poorSleep =
    (sleepHours !== null && sleepHours < 6.5) ||
    (sleepScore !== null && sleepScore < 70) ||
    (sleepQuality !== null && sleepQuality < 75)

  const highAtl = atl !== null && atl >= 95
  const triggered = isFitbit && lowHrv && poorSleep && highAtl

  const baselineText = baselineHrv !== null ? `${baselineHrv.toFixed(1)}ms` : 'unknown'
  const summary = triggered
    ? `FITBIT RECOVERY ALERT: low HRV + poor sleep + high ATL detected (HRV ${currentHrv ?? 'n/a'}ms vs baseline ${baselineText}, ATL ${atl ?? 'n/a'}). Bias recommendation to rest/reduce intensity today.`
    : isFitbit
      ? `Fitbit recovery flags - lowHRV:${lowHrv ? 'yes' : 'no'}, poorSleep:${poorSleep ? 'yes' : 'no'}, highATL:${highAtl ? 'yes' : 'no'}. No Fitbit recovery alert triggered.`
      : `Not a Fitbit-sourced wellness day; Fitbit recovery alert not evaluated. Flags - lowHRV:${lowHrv ? 'yes' : 'no'}, poorSleep:${poorSleep ? 'yes' : 'no'}, highATL:${highAtl ? 'yes' : 'no'}.`

  return {
    isFitbit,
    lowHrv,
    poorSleep,
    highAtl,
    triggered,
    baselineHrv,
    summary
  }
}

export function getCanonicalWellnessReadiness(
  wellness:
    | {
        readiness?: number | null
        recoveryScore?: number | null
        lastSource?: string | null
        rawJson?: any | null
      }
    | null
    | undefined
): number | null {
  if (!wellness) return null

  const source = `${wellness.lastSource || ''}`.toLowerCase()
  const raw = wellness.rawJson

  if (raw && typeof raw === 'object') {
    if (source === 'oura') {
      const ouraReadiness = normalizeReadinessScore(toFiniteNumber(raw.readiness_score))
      if (ouraReadiness !== null) return ouraReadiness
    }

    if (source === 'whoop') {
      const whoopRecovery = normalizeReadinessScore(toFiniteNumber(raw.recovery_score))
      if (whoopRecovery !== null) return whoopRecovery
    }
  }

  return wellness.readiness ?? wellness.recoveryScore ?? null
}
