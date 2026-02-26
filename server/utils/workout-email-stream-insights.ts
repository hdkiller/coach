import {
  calculateEfficiencyFactorDecay,
  calculateFatigueSensitivity,
  calculateWPrimeBalance
} from './performance-metrics'
import { detectSurgesAndFades } from './interval-detection'

type StreamInsightsInput = {
  durationSec?: number | null
  elapsedTimeSec?: number | null
  decouplingPct?: number | null
  ftp?: number | null
  wPrime?: number | null
  wBalDepletion?: number | null
  streams?: {
    time?: unknown
    watts?: unknown
    heartrate?: unknown
    cadence?: unknown
    distance?: unknown
    grade?: unknown
    moving?: unknown
    surges?: unknown
  } | null
}

type StreamInsightsResult = {
  bullets: string[]
  whatItMeans?: string
  nextWorkoutSuggestion?: string
}

const REQUIRED_STREAMS = ['time', 'watts', 'heartrate', 'cadence', 'distance'] as const

function asNumberArray(value: unknown): number[] | null {
  if (!value) return null
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'object' && value !== null && Array.isArray((value as any).data)
      ? (value as any).data
      : null
  if (!raw || raw.length === 0) return null
  if (!raw.every((entry) => typeof entry === 'number' && Number.isFinite(entry))) return null
  return raw as number[]
}

function asSurges(value: unknown): Array<{ duration: number }> {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const duration = (entry as any).duration
      if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) return null
      return { duration }
    })
    .filter((entry): entry is { duration: number } => Boolean(entry))
}

function round(value: number, decimals: number = 1) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function avg(values: number[]) {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function halfDeltaPercent(stream: number[], minValid: number) {
  if (!stream.length) return null
  const midpoint = Math.floor(stream.length / 2)
  if (midpoint < 30) return null

  const first = stream.slice(0, midpoint).filter((v) => v > minValid)
  const second = stream.slice(midpoint).filter((v) => v > minValid)
  const firstAvg = avg(first)
  const secondAvg = avg(second)
  if (!firstAvg || !secondAvg || firstAvg <= 0) return null

  return ((secondAvg - firstAvg) / firstAvg) * 100
}

export function buildWorkoutStreamInsights(input: StreamInsightsInput): StreamInsightsResult {
  const bullets: string[] = []
  const streams = input.streams || undefined
  if (!streams) {
    return { bullets: [] }
  }

  const time = asNumberArray(streams?.time)
  const watts = asNumberArray(streams?.watts)
  const hr = asNumberArray(streams?.heartrate)
  const cadence = asNumberArray(streams?.cadence)
  const distance = asNumberArray(streams?.distance)
  const grade = asNumberArray(streams?.grade)
  const moving = streams?.moving

  const requiredMap = { time, watts, heartrate: hr, cadence, distance }
  const missingRequired = REQUIRED_STREAMS.filter((key) => !requiredMap[key])
  const presentRequired = REQUIRED_STREAMS.filter((key) => Boolean(requiredMap[key]))
  if (presentRequired.length === 0) {
    return { bullets: [] }
  }

  if (presentRequired.length === REQUIRED_STREAMS.length) {
    const lengths = REQUIRED_STREAMS.map((key) => requiredMap[key]!.length)
    const equalLength = lengths.every((length) => length === lengths[0])
    if (equalLength) {
      bullets.push(
        `Data quality: ${REQUIRED_STREAMS.join('/')} streams are complete and aligned (${lengths[0]} points each).`
      )
    } else {
      bullets.push(
        `Data quality: core streams are present but lengths are inconsistent (${lengths.join('/')}).`
      )
    }
  } else if (presentRequired.length > 0 || missingRequired.length > 0) {
    bullets.push(
      `Data quality: present ${presentRequired.join('/') || 'none'}; missing ${missingRequired.join('/') || 'none'}.`
    )
  }

  if (!grade) {
    bullets.push('Stream note: grade stream is missing.')
  }
  if (!moving) {
    bullets.push('Stream note: moving stream is missing.')
  }

  const streamSpanSec =
    time && time.length > 1 ? Math.max(0, (time[time.length - 1] || 0) - (time[0] || 0)) : null
  const durationReference = input.elapsedTimeSec || input.durationSec || null
  if (durationReference && streamSpanSec && durationReference > 0) {
    const deltaPct = Math.abs(streamSpanSec - durationReference) / durationReference
    if (deltaPct > 0.05) {
      const label = input.elapsedTimeSec ? 'elapsed time' : 'duration'
      bullets.push(
        `Duration check: time stream spans ${Math.round(streamSpanSec)}s vs ${label} ${Math.round(durationReference)}s (${round(deltaPct * 100)}% difference).`
      )
    }
  }

  let efDecayPct: number | null = null
  if (time && watts && hr && time.length === watts.length && time.length === hr.length) {
    const efDecay = calculateEfficiencyFactorDecay(watts, hr, time)
    efDecayPct = efDecay ? efDecay.totalDecay : null
  }
  const fatigue = time && watts && hr ? calculateFatigueSensitivity(watts, hr, time) : null
  const fatigueDecayPct = fatigue ? fatigue.decay : null
  const decouplingPct = typeof input.decouplingPct === 'number' ? input.decouplingPct : null

  if (efDecayPct !== null || fatigueDecayPct !== null || decouplingPct !== null) {
    const parts: string[] = []
    if (efDecayPct !== null) parts.push(`EF decay ${round(efDecayPct)}%`)
    if (decouplingPct !== null) parts.push(`decoupling ${round(decouplingPct)}%`)
    if (fatigueDecayPct !== null) parts.push(`fatigue sensitivity ${round(fatigueDecayPct)}%`)
    const tone =
      (efDecayPct !== null && efDecayPct > 10) || (fatigueDecayPct !== null && fatigueDecayPct > 10)
        ? 'strong drift signal'
        : (efDecayPct !== null && efDecayPct > 5) ||
            (fatigueDecayPct !== null && fatigueDecayPct > 5)
          ? 'moderate drift signal'
          : 'stable aerobic signal'
    bullets.push(`Cardio drift: ${parts.join(', ')} (${tone}).`)
  }

  const powerSplit = watts ? halfDeltaPercent(watts, 0) : null
  const hrSplit = hr ? halfDeltaPercent(hr, 40) : null
  if (powerSplit !== null && hrSplit !== null) {
    const disproportion = hrSplit - powerSplit >= 8 && hrSplit >= 12
    bullets.push(
      disproportion
        ? `Pacing: second-half power ${powerSplit >= 0 ? '+' : ''}${round(powerSplit)}% while HR rose ${hrSplit >= 0 ? '+' : ''}${round(hrSplit)}%; HR rose disproportionately to power.`
        : `Pacing: second-half power ${powerSplit >= 0 ? '+' : ''}${round(powerSplit)}% and HR ${hrSplit >= 0 ? '+' : ''}${round(hrSplit)}%.`
    )
  }

  let surges = asSurges(streams?.surges)
  if ((!surges || surges.length === 0) && time && watts && input.ftp && input.ftp > 0) {
    surges = detectSurgesAndFades(time, watts, input.ftp)
  }
  const surgeSeconds = surges.reduce((sum, surge) => sum + surge.duration, 0)
  const intensityDuration = durationReference || streamSpanSec || null
  const surgeSecondsPct =
    intensityDuration && intensityDuration > 0 ? (surgeSeconds / intensityDuration) * 100 : null

  let wPrimeDepletionPct: number | null = null
  if (
    typeof input.wBalDepletion === 'number' &&
    input.wBalDepletion > 0 &&
    typeof input.wPrime === 'number' &&
    input.wPrime > 0
  ) {
    wPrimeDepletionPct = (input.wBalDepletion / input.wPrime) * 100
  } else if (time && watts && input.ftp && input.ftp > 0) {
    const capacity = input.wPrime && input.wPrime > 0 ? input.wPrime : 20000
    const wPrimeModel = calculateWPrimeBalance(watts, time, input.ftp, capacity)
    wPrimeDepletionPct = ((capacity - wPrimeModel.minWPrimeBalance) / capacity) * 100
  }

  if (surges.length > 0 || wPrimeDepletionPct !== null) {
    const highIntensitySeconds = watts
      ? watts.filter((value) => value > (input.ftp && input.ftp > 0 ? input.ftp * 1.2 : 300)).length
      : null
    const lowAnaerobicDemand =
      surgeSecondsPct !== null &&
      surgeSecondsPct < 1 &&
      wPrimeDepletionPct !== null &&
      wPrimeDepletionPct < 5
    bullets.push(
      lowAnaerobicDemand
        ? `Intensity profile: ${surges.length} surges, ${Math.round(surgeSeconds)}s surge time, W' depletion ${round(wPrimeDepletionPct || 0)}% (${highIntensitySeconds ?? 0}s high-intensity). Mostly aerobic/endurance demand.`
        : `Intensity profile: ${surges.length} surges, ${Math.round(surgeSeconds)}s surge time, W' depletion ${wPrimeDepletionPct !== null ? `${round(wPrimeDepletionPct)}%` : 'n/a'}${highIntensitySeconds !== null ? `, ${highIntensitySeconds}s high-intensity` : ''}.`
    )
  }

  const trimmedBullets = bullets.filter(Boolean).slice(0, 5)
  if (!trimmedBullets.length) {
    return { bullets: [] }
  }

  const strongDrift =
    (efDecayPct !== null && efDecayPct > 10) || (fatigueDecayPct !== null && fatigueDecayPct > 10)
  const hasDurationMismatch = trimmedBullets.some((bullet) => bullet.startsWith('Duration check:'))
  const whatItMeans = strongDrift
    ? 'What this means: aerobic durability dropped as the session progressed, so this effort likely carried more fatigue than power alone suggests.'
    : hasDurationMismatch
      ? 'What this means: your session data has small integrity gaps, so trend interpretation should be slightly cautious.'
      : 'What this means: this was a mostly controlled aerobic session with useful pacing and durability signal.'

  const nextWorkoutSuggestion = strongDrift
    ? 'Next workout suggestion: start 3-5% easier for the first third and fuel earlier to reduce late-session drift.'
    : 'Next workout suggestion: keep the opening half steady and finish with a short controlled progression to validate pacing.'

  return {
    bullets: trimmedBullets,
    whatItMeans,
    nextWorkoutSuggestion
  }
}
