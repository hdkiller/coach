import {
  applyRunTargetPolicyToStep,
  applyTargetFormatPolicyToStep,
  applyStepIntentGuard
} from '../../trigger/utils/workout-targeting'
import type { TargetPolicy } from './workout-target-policy'
import type { TargetFormatPolicy } from './workout-target-format-policy'

type StepMetric = 'power' | 'heartRate' | 'pace' | 'rpe'

type MetricRefs = {
  ftp: number
  lthr: number
  maxHr: number
  thresholdPace: number
  hrZones: any[]
  powerZones: any[]
  paceZones: any[]
}

type NormalizeContext = {
  refs: MetricRefs
  targetPolicy: TargetPolicy
  targetFormatPolicy: TargetFormatPolicy
  workoutType?: string | null
}

export const toPositiveInt = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined
  const raw =
    typeof value === 'string'
      ? value.trim().length > 0
        ? Number(value.trim())
        : NaN
      : Number(value)
  if (!Number.isFinite(raw)) return undefined
  const int = Math.trunc(raw)
  return int > 0 ? int : undefined
}

export function normalizeStructuredWorkoutRepetition(structuredWorkout: any) {
  const normalized = JSON.parse(JSON.stringify(structuredWorkout || {}))

  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach((entry) => visit(entry))
      return
    }

    const reps =
      toPositiveInt(node.reps) ?? toPositiveInt(node.repeat) ?? toPositiveInt(node.intervals)
    if (reps !== undefined) {
      node.reps = reps
    }

    if ('repeat' in node) delete node.repeat
    if ('intervals' in node && reps !== undefined) delete node.intervals

    Object.values(node).forEach((value) => visit(value))
  }

  visit(normalized)
  return normalized
}

function hasMetricTarget(step: any, metric: StepMetric) {
  if (metric === 'rpe') return typeof step?.rpe === 'number'
  const target = step?.[metric]
  return Boolean(target && (typeof target.value === 'number' || target.range))
}

function normalizePrimaryTarget(step: any, fallbackOrder: StepMetric[]) {
  const current = String(step?.primaryTarget || '')
  if ((['power', 'heartRate', 'pace', 'rpe'] as string[]).includes(current)) {
    return current as StepMetric
  }
  for (const metric of fallbackOrder) {
    if (hasMetricTarget(step, metric)) return metric
  }
  return undefined
}

function getTargetMidpoint(target: any): number | null {
  if (!target || typeof target !== 'object') return null
  if (typeof target.value === 'number') return target.value
  if (
    target.range &&
    typeof target.range.start === 'number' &&
    typeof target.range.end === 'number'
  ) {
    return (target.range.start + target.range.end) / 2
  }
  return null
}

function getZoneBoundsFromRefs(
  kind: 'heartRate' | 'power' | 'pace',
  zoneValue: number,
  refs: {
    ftp: number
    lthr: number
    maxHr: number
    thresholdPace: number
    hrZones?: any[]
    powerZones?: any[]
    paceZones?: any[]
  }
): { start: number; end: number } | null {
  const zoneIndex = Math.max(1, Math.round(zoneValue)) - 1
  if (kind === 'power') {
    const zone = refs.powerZones?.[zoneIndex]
    const min = Number(zone?.min)
    const max = Number(zone?.max)
    if (Number.isFinite(min) && Number.isFinite(max) && refs.ftp > 0) {
      return { start: min / refs.ftp, end: max / refs.ftp }
    }
    return null
  }
  if (kind === 'heartRate') {
    const zone = refs.hrZones?.[zoneIndex]
    const min = Number(zone?.min)
    const max = Number(zone?.max)
    if (Number.isFinite(min) && Number.isFinite(max)) {
      const denom = refs.lthr > 0 ? refs.lthr : refs.maxHr
      if (denom > 0) return { start: min / denom, end: max / denom }
    }
    return null
  }

  const zone = refs.paceZones?.[zoneIndex]
  const min = Number(zone?.min)
  const max = Number(zone?.max)
  if (Number.isFinite(min) && Number.isFinite(max) && refs.thresholdPace > 0) {
    return { start: min / refs.thresholdPace, end: max / refs.thresholdPace }
  }
  return null
}

function defaultRunSpeedFromIntent(
  intent: string | undefined,
  thresholdPace: number
): number | null {
  if (!(thresholdPace > 0)) return null
  const normalized = String(intent || '').toLowerCase()
  const factor =
    normalized === 'warmup'
      ? 0.72
      : normalized === 'recovery'
        ? 0.7
        : normalized === 'easy'
          ? 0.78
          : normalized === 'endurance'
            ? 0.85
            : normalized === 'tempo'
              ? 0.94
              : normalized === 'threshold'
                ? 1.0
                : normalized === 'vo2'
                  ? 1.06
                  : normalized === 'anaerobic'
                    ? 1.12
                    : normalized === 'sprint'
                      ? 1.2
                      : normalized === 'cooldown'
                        ? 0.68
                        : normalized === 'strides'
                          ? 1.1
                          : 0.82
  return thresholdPace * factor
}

function inferStepSpeedMps(
  step: any,
  refs: { ftp: number; lthr: number; maxHr: number; thresholdPace: number },
  fallbackOrder: StepMetric[]
): number | null {
  const orderedMetrics: StepMetric[] = []
  const primaryTarget = normalizePrimaryTarget(step, fallbackOrder)
  if (primaryTarget) orderedMetrics.push(primaryTarget)
  for (const metric of fallbackOrder) {
    if (!orderedMetrics.includes(metric)) orderedMetrics.push(metric)
  }

  for (const metric of orderedMetrics) {
    if (metric !== 'pace') continue
    const target = step?.pace
    const value = getTargetMidpoint(target)
    if (value === null || !Number.isFinite(value)) continue
    const units = String(target?.units || '')
      .trim()
      .toLowerCase()
    if (units === 'm/s') return value
    if (units.includes('/')) {
      const secondsPerKm = value * 60
      if (secondsPerKm > 0) return 1000 / secondsPerKm
    }
    if (value > 1.5 && value < 8) return value
    if (refs.thresholdPace > 0) {
      if (value > 3) return value / refs.thresholdPace
      return value * refs.thresholdPace
    }
  }

  return defaultRunSpeedFromIntent(step?.intent, refs.thresholdPace)
}

export function toIntensityFactorFromTarget(
  target: any,
  kind: 'heartRate' | 'power' | 'pace',
  refs: {
    ftp: number
    lthr: number
    maxHr: number
    thresholdPace: number
    hrZones?: any[]
    powerZones?: any[]
    paceZones?: any[]
  }
): number | null {
  const value = getTargetMidpoint(target)
  if (value === null || !Number.isFinite(value)) return null
  const units = String(target?.units || '')
    .trim()
    .toLowerCase()
  const clamp = (n: number) => Math.max(0.3, Math.min(1.8, n))
  const paceValueToMps = (paceValue: number) => {
    if (!Number.isFinite(paceValue) || paceValue <= 0) return null
    if (units === 'm/s') return paceValue
    if (units.includes('/')) {
      const secondsPerKm = paceValue * 60
      return secondsPerKm > 0 ? 1000 / secondsPerKm : null
    }
    if (paceValue > 1.5 && paceValue < 8) return paceValue
    if (refs.thresholdPace > 0) {
      if (paceValue > 3) return paceValue / refs.thresholdPace
      return paceValue * refs.thresholdPace
    }
    return null
  }

  if (kind === 'heartRate') {
    if (units === 'bpm') {
      if (refs.lthr > 0) return clamp(value / refs.lthr)
      if (refs.maxHr > 0) return clamp(value / refs.maxHr)
      return clamp(value > 2 ? value / 100 : value)
    }
    if (units.includes('zone')) {
      const bounds = getZoneBoundsFromRefs('heartRate', value, refs)
      if (bounds) return clamp((bounds.start + bounds.end) / 2)
      return clamp(0.45 + Math.max(1, Math.min(7, value)) * 0.1)
    }
    return clamp(value > 2 ? value / 100 : value)
  }

  if (kind === 'power') {
    if (units === 'w' || units === 'watts') {
      if (refs.ftp > 0) return clamp(value / refs.ftp)
      return clamp(value > 3 ? value / 250 : value)
    }
    if (units === 'power_zone' || units.includes('zone') || units.startsWith('z')) {
      const bounds = getZoneBoundsFromRefs('power', value, refs)
      if (bounds) return clamp((bounds.start + bounds.end) / 2)
      return clamp(0.45 + Math.max(1, Math.min(7, value)) * 0.1)
    }
    return clamp(value > 3 ? value / 100 : value)
  }

  if (units.includes('zone')) {
    const bounds = getZoneBoundsFromRefs('pace', value, refs)
    if (bounds) return clamp((bounds.start + bounds.end) / 2)
    return clamp(0.45 + Math.max(1, Math.min(7, value)) * 0.1)
  }
  const metersPerSecond = paceValueToMps(value)
  if (metersPerSecond !== null && refs.thresholdPace > 0)
    return clamp(metersPerSecond / refs.thresholdPace)
  return clamp(value > 2 ? value / 100 : value)
}

export function selectStepIntensity(
  step: any,
  refs: {
    ftp: number
    lthr: number
    maxHr: number
    thresholdPace: number
    hrZones?: any[]
    powerZones?: any[]
    paceZones?: any[]
  },
  fallbackOrder: StepMetric[]
) {
  const orderedMetrics: StepMetric[] = []
  const primaryTarget = normalizePrimaryTarget(step, fallbackOrder)
  if (primaryTarget) orderedMetrics.push(primaryTarget)
  for (const metric of fallbackOrder) {
    if (!orderedMetrics.includes(metric)) orderedMetrics.push(metric)
  }

  for (const metric of orderedMetrics) {
    if (metric === 'rpe') {
      if (typeof step?.rpe === 'number') return Math.max(0.3, Math.min(1.3, step.rpe / 10))
      continue
    }
    const intensity = toIntensityFactorFromTarget(step?.[metric], metric, refs)
    if (intensity !== null) return intensity
  }

  if (step?.type === 'Rest' || step?.type === 'Cooldown') return 0.4
  if (step?.type === 'Warmup') return 0.5
  return 0.75
}

export function estimateStepDurationSeconds(
  step: any,
  context: {
    refs: { ftp: number; lthr: number; maxHr: number; thresholdPace: number }
    fallbackOrder: StepMetric[]
    workoutType?: string | null
  }
): number {
  const explicitDuration = Number(step?.durationSeconds || step?.duration || 0)
  if (explicitDuration > 0) return explicitDuration

  const explicitDistance = Number(step?.distance || 0)
  if (explicitDistance > 0) {
    const workoutType = String(context.workoutType || '').toLowerCase()
    if (workoutType.includes('run')) {
      const speedMps = inferStepSpeedMps(step, context.refs, context.fallbackOrder)
      if (speedMps && speedMps > 0) return Math.round(explicitDistance / speedMps)
    }

    return Math.round(explicitDistance * 3)
  }

  if (step?.type !== 'Rest') return 60
  return 0
}

export function estimateStepDistanceMeters(
  step: any,
  context: {
    refs: { ftp: number; lthr: number; maxHr: number; thresholdPace: number }
    fallbackOrder: StepMetric[]
    workoutType?: string | null
  }
): number {
  const explicitDistance = Number(step?.distance || 0)
  if (explicitDistance > 0) return explicitDistance

  const workoutType = String(context.workoutType || '').toLowerCase()
  if (!workoutType.includes('run')) return 0

  const durationSec = Number(step?.durationSeconds || step?.duration || 0)
  if (durationSec <= 0) return 0

  const speedMps = inferStepSpeedMps(step, context.refs, context.fallbackOrder)
  if (!(speedMps && speedMps > 0)) return 0
  return Math.round(durationSec * speedMps)
}

export function normalizeStructuredWorkoutForPersistence(
  structuredWorkout: any,
  context: NormalizeContext
) {
  const normalized = normalizeStructuredWorkoutRepetition(structuredWorkout)
  const isRun = String(context.workoutType || '')
    .toLowerCase()
    .includes('run')

  const visitStep = (step: any) => {
    if (!step || typeof step !== 'object') return

    if (step.durationSeconds === undefined && step.duration !== undefined) {
      const duration = toPositiveInt(step.duration)
      if (duration) step.durationSeconds = duration
    }

    const primaryTarget = normalizePrimaryTarget(
      step,
      context.targetPolicy.fallbackOrder as StepMetric[]
    )
    if (primaryTarget) step.primaryTarget = primaryTarget

    if (isRun) {
      console.log('[Persistence] Calling applyRunTargetPolicyToStep for run step:', step.name)
      applyRunTargetPolicyToStep(step, context.targetPolicy)
    }

    applyTargetFormatPolicyToStep(step, context.targetFormatPolicy, {
      ftp: context.refs.ftp,
      lthr: context.refs.lthr,
      maxHr: context.refs.maxHr,
      thresholdPace: context.refs.thresholdPace,
      hrZones: context.refs.hrZones,
      powerZones: context.refs.powerZones,
      paceZones: context.refs.paceZones
    })
    applyStepIntentGuard(step, {
      ftp: context.refs.ftp,
      lthr: context.refs.lthr,
      thresholdPace: context.refs.thresholdPace
    })

    if (Array.isArray(step.steps)) {
      step.steps.forEach((child: any) => visitStep(child))
    }
  }

  if (Array.isArray(normalized?.steps)) {
    normalized.steps.forEach((step: any) => visitStep(step))
  }

  return normalized
}

export function computeStructuredWorkoutMetrics(
  structuredWorkout: any,
  context: {
    refs: { ftp: number; lthr: number; maxHr: number; thresholdPace: number }
    fallbackOrder: StepMetric[]
    workoutType?: string | null
  }
) {
  const walk = (steps: any[]): { duration: number; tss: number; distance: number } => {
    let duration = 0
    let tss = 0
    let distance = 0

    for (const step of steps || []) {
      const reps = toPositiveInt(step?.reps) || 1
      let stepDuration = 0
      let stepTss = 0
      let stepDistance = 0

      if (Array.isArray(step?.steps) && step.steps.length > 0) {
        const nested = walk(step.steps)
        stepDuration = nested.duration
        stepTss = nested.tss
        stepDistance = nested.distance
      } else {
        stepDuration = estimateStepDurationSeconds(step, context)
        stepDistance = estimateStepDistanceMeters(step, context)

        const intensity = selectStepIntensity(step, context.refs, context.fallbackOrder)
        if (stepDuration > 0) {
          stepTss = ((stepDuration * intensity * intensity) / 3600) * 100
        }
      }

      duration += stepDuration * reps
      tss += stepTss * reps
      distance += stepDistance * reps
    }

    return { duration, tss, distance }
  }

  const totals = walk(structuredWorkout?.steps || [])
  const durationSec = Math.round(totals.duration)
  const tss = Math.round(totals.tss)
  const workIntensity =
    durationSec > 0 && tss > 0 ? Number(Math.sqrt((36 * tss) / durationSec).toFixed(2)) : null
  const distanceMeters = Math.round(totals.distance)
  return { durationSec, distanceMeters, tss, workIntensity }
}

export function computeStructuredWorkoutDurationSec(structuredWorkout: any) {
  return computeStructuredWorkoutMetrics(structuredWorkout, {
    refs: {
      ftp: 0,
      lthr: 0,
      maxHr: 0,
      thresholdPace: 0
    },
    fallbackOrder: ['power', 'heartRate', 'pace', 'rpe']
  }).durationSec
}

export function getPendingSyncStatus(syncStatus: string | null | undefined) {
  return syncStatus === 'LOCAL_ONLY' ? 'LOCAL_ONLY' : 'PENDING'
}
