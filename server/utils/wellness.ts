export function getMoodLabel(score: number | null | undefined): string {
  if (score === null || score === undefined || score === 0) return 'N/A'
  if (score >= 8) return 'Great'
  if (score >= 6) return 'Good'
  if (score >= 4) return 'OK'
  return 'Grumpy'
}

export function getStressLabel(score: number | null | undefined): string {
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

export interface FitbitRecoveryAlertInput {
  source?: string | null
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

function toFiniteNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function evaluateFitbitRecoveryAlert(
  input: FitbitRecoveryAlertInput
): FitbitRecoveryAlertResult {
  const source = `${input.lastSource || input.source || ''}`.toLowerCase()
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
    : `Fitbit recovery flags — lowHRV:${lowHrv ? 'yes' : 'no'}, poorSleep:${poorSleep ? 'yes' : 'no'}, highATL:${highAtl ? 'yes' : 'no'}.`

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
