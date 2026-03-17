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

export function getCanonicalWellnessStress(
  wellness:
    | {
        stress?: number | null
        lastSource?: string | null
        rawJson?: Record<string, any> | null
      }
    | null
    | undefined
): number | null {
  if (!wellness) return null

  const source = `${wellness.lastSource || ''}`.toLowerCase()
  const raw = wellness.rawJson

  if (raw && typeof raw === 'object') {
    if (source === 'garmin') {
      const garminStress = normalizeStressScoreForStorage(
        toFiniteNumber(raw.averageStressLevel ?? raw.AverageDailyStress)
      )
      if (garminStress !== null) return garminStress
    }

    if (source === 'intervals') {
      const intervalsStress = mapIntervalsStressValue(raw.stress)
      if (intervalsStress !== null) return intervalsStress
      if (raw.stress == null) return null
    }
  }

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
      ? `Fitbit recovery flags — lowHRV:${lowHrv ? 'yes' : 'no'}, poorSleep:${poorSleep ? 'yes' : 'no'}, highATL:${highAtl ? 'yes' : 'no'}. No Fitbit recovery alert triggered.`
      : `Not a Fitbit-sourced wellness day; Fitbit recovery alert not evaluated. Flags — lowHRV:${lowHrv ? 'yes' : 'no'}, poorSleep:${poorSleep ? 'yes' : 'no'}, highATL:${highAtl ? 'yes' : 'no'}.`

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
