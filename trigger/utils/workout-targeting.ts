import {
  formatSteadyTargetStyleInstruction,
  normalizeTargetPolicy,
  toLegacyLoadPreference,
  type MetricTarget,
  type TargetPolicy
} from '../../server/utils/workout-target-policy'
import {
  normalizeTargetFormatPolicy,
  type TargetFormatPolicy
} from '../../server/utils/workout-target-format-policy'

type TargetStepMetric = 'power' | 'heartRate' | 'pace' | 'rpe'
export type StepIntent =
  | 'warmup'
  | 'recovery'
  | 'easy'
  | 'endurance'
  | 'tempo'
  | 'threshold'
  | 'vo2'
  | 'anaerobic'
  | 'sprint'
  | 'cooldown'
  | 'drills'
  | 'strides'

export const STEP_INTENTS: StepIntent[] = [
  'warmup',
  'recovery',
  'easy',
  'endurance',
  'tempo',
  'threshold',
  'vo2',
  'anaerobic',
  'sprint',
  'cooldown',
  'drills',
  'strides'
]

export interface WorkoutTargetingOverride {
  targetPolicy?: Partial<TargetPolicy> | null
  targetFormatPolicy?: {
    heartRate?: Partial<TargetFormatPolicy['heartRate']>
    power?: Partial<TargetFormatPolicy['power']>
    pace?: Partial<TargetFormatPolicy['pace']>
    cadence?: Partial<TargetFormatPolicy['cadence']>
  } | null
  loadPreference?: string | null
}

function toMetricToken(metric: MetricTarget): string {
  if (metric === 'heartRate') return 'HR'
  if (metric === 'power') return 'POWER'
  if (metric === 'pace') return 'PACE'
  return 'RPE'
}

function metricLabel(metric: MetricTarget): string {
  if (metric === 'heartRate') return 'Heart Rate'
  if (metric === 'power') return 'Power'
  if (metric === 'pace') return 'Pace'
  return 'RPE'
}

function cloneZones(value: unknown) {
  return Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : []
}

function hasMetricTarget(step: any, metric: TargetStepMetric): boolean {
  if (metric === 'rpe') return typeof step?.rpe === 'number'
  const target = step?.[metric]
  return Boolean(target && (typeof target.value === 'number' || target.range))
}

function defaultMetricValue(stepType: string | undefined): number {
  if (stepType === 'Warmup') return 0.6
  if (stepType === 'Rest') return 0.5
  if (stepType === 'Cooldown') return 0.55
  return 0.75
}

function ensureMetricTarget(step: any, metric: TargetStepMetric, value: number) {
  if (metric === 'heartRate') {
    step.heartRate = step.heartRate || {}
    if (typeof step.heartRate.value !== 'number' && !step.heartRate.range) {
      step.heartRate.value = value
    }
    if (!step.heartRate.units) step.heartRate.units = 'LTHR'
    return
  }

  if (metric === 'power') {
    step.power = step.power || {}
    if (typeof step.power.value !== 'number' && !step.power.range) {
      step.power.value = value
    }
    if (!step.power.units) step.power.units = '%'
    return
  }

  if (metric === 'pace') {
    step.pace = step.pace || {}
    if (typeof step.pace.value !== 'number' && !step.pace.range) {
      step.pace.value = value
    }
    if (!step.pace.units) step.pace.units = 'Pace'
    return
  }

  if (typeof step.rpe !== 'number') {
    step.rpe = Math.min(10, Math.max(1, Math.round(value * 10)))
  }
}

function removeOtherMetricTargets(step: any, selectedMetric: TargetStepMetric) {
  if (selectedMetric !== 'power') delete step.power
  if (selectedMetric !== 'heartRate') delete step.heartRate
  if (selectedMetric !== 'pace') delete step.pace
  if (selectedMetric !== 'rpe') delete step.rpe
}

export function normalizeCooldownRampDirection(step: any) {
  if (step?.type !== 'Cooldown') return

  for (const metric of ['power', 'heartRate', 'pace'] as const) {
    const target = step?.[metric]
    if (!target?.range || target.ramp !== true) continue
    const start = Number(target.range.start)
    const end = Number(target.range.end)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) continue
    target.range = { start: end, end: start }
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function normalizeIntent(value: unknown): StepIntent | null {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
  return STEP_INTENTS.includes(raw as StepIntent) ? (raw as StepIntent) : null
}

function shouldTreatRangeAsRamp(step: any, target: any): boolean {
  if (!target?.range) return false
  if (target.ramp === true) return true
  const stepType = String(step?.type || '')
    .trim()
    .toLowerCase()
  return stepType === 'warmup' || stepType === 'cooldown'
}

function defaultIntentForStepType(stepType: string | undefined): StepIntent {
  if (stepType === 'Warmup') return 'warmup'
  if (stepType === 'Cooldown') return 'cooldown'
  if (stepType === 'Rest') return 'recovery'
  return 'endurance'
}

function intentBand(intent: StepIntent): { low: number; high: number } {
  switch (intent) {
    case 'warmup':
      return { low: 0.5, high: 0.7 }
    case 'cooldown':
      return { low: 0.45, high: 0.65 }
    case 'recovery':
      return { low: 0.45, high: 0.65 }
    case 'easy':
      return { low: 0.6, high: 0.75 }
    case 'endurance':
      return { low: 0.7, high: 0.82 }
    case 'tempo':
      return { low: 0.82, high: 0.92 }
    case 'threshold':
      return { low: 0.92, high: 1.02 }
    case 'vo2':
      return { low: 1.03, high: 1.12 }
    case 'anaerobic':
      return { low: 1.1, high: 1.3 }
    case 'sprint':
      return { low: 1.2, high: 1.5 }
    case 'drills':
      return { low: 0.6, high: 0.8 }
    case 'strides':
      return { low: 1.0, high: 1.2 }
    default:
      return { low: 0.65, high: 0.85 }
  }
}

function inferIntentFromFactor(
  factor: number,
  fallbackIntent: StepIntent,
  stepType?: string
): StepIntent {
  if (!Number.isFinite(factor)) return fallbackIntent
  const candidates = STEP_INTENTS.filter((intent) => {
    if (stepType === 'Warmup') return intent === 'warmup'
    if (stepType === 'Cooldown') return intent === 'cooldown'
    if (stepType === 'Rest') return intent === 'recovery'
    return !['warmup', 'cooldown'].includes(intent)
  })

  const containing = candidates.find((intent) => {
    const band = intentBand(intent)
    return factor >= band.low && factor <= band.high
  })
  if (containing) return containing

  let closest = fallbackIntent
  let smallestDistance = Number.POSITIVE_INFINITY
  for (const intent of candidates) {
    const band = intentBand(intent)
    const midpoint = (band.low + band.high) / 2
    const distance = Math.abs(midpoint - factor)
    if (distance < smallestDistance) {
      smallestDistance = distance
      closest = intent
    }
  }
  return closest
}

function targetFactor(
  target: any,
  metric: TargetStepMetric,
  refs: { ftp: number; lthr: number; thresholdPace: number }
): number | null {
  const base = toTargetObject(target)
  const value = targetMidpoint(base)
  if (value === null) return null
  const units = String(base?.units || '').toLowerCase()

  if (metric === 'heartRate') {
    if (units === 'bpm') return refs.lthr > 0 ? value / refs.lthr : null
    if (value > 2) return value / 100
    return value
  }

  if (metric === 'power') {
    if (units === 'w' || units === 'watts') return refs.ftp > 0 ? value / refs.ftp : null
    if (value > 3) return value / 100
    return value
  }

  if (metric === 'pace') {
    if (units.includes('zone')) return clamp(0.45 + Math.max(1, Math.min(7, value)) * 0.1, 0.3, 1.5)
    const mps = paceValueToMps(value, units, refs.thresholdPace)
    if (mps !== null && refs.thresholdPace > 0) return mps / refs.thresholdPace
    if (value > 2) return value / 100
    return value
  }

  if (metric === 'rpe') return clamp(value / 10, 0.3, 1.5)
  return null
}

export function applyStepIntentGuard(
  step: any,
  refs: { ftp: number; lthr: number; thresholdPace: number }
) {
  const explicitIntent = normalizeIntent(step?.intent)
  const intent = explicitIntent || defaultIntentForStepType(step?.type)
  step.intent = intent

  const primary = (step?.primaryTarget || 'heartRate') as TargetStepMetric
  const preferredMetric: TargetStepMetric =
    primary === 'heartRate' || primary === 'power' || primary === 'pace' || primary === 'rpe'
      ? primary
      : 'heartRate'
  const metricOrder: TargetStepMetric[] = [preferredMetric, 'heartRate', 'power', 'pace', 'rpe']
  const dedupedMetricOrder = metricOrder.filter((m, i) => metricOrder.indexOf(m) === i)
  const selectedMetric = dedupedMetricOrder.find(
    (metric) => targetFactor(step[metric], metric, refs) !== null
  )
  if (!selectedMetric) return
  const factor = targetFactor(step[selectedMetric], selectedMetric, refs)
  if (factor === null) return

  const band = intentBand(intent)
  if (explicitIntent) {
    const inferredIntent = inferIntentFromFactor(factor, intent, step?.type)
    step.intent = inferredIntent
    if (!step.primaryTarget) step.primaryTarget = selectedMetric
    return
  }

  if (factor >= band.low && factor <= band.high) return

  const shouldClampInferredTarget =
    !explicitIntent && ['Warmup', 'Cooldown', 'Rest'].includes(String(step?.type || ''))

  if (shouldClampInferredTarget) {
    if (selectedMetric === 'heartRate') {
      const nextValue = refs.lthr > 0 ? clamp(factor, band.low, band.high) * refs.lthr : null
      if (nextValue !== null) {
        if (step.heartRate?.range) {
          const width = Math.max(0, (step.heartRate.range.end - step.heartRate.range.start) / 2)
          const clampedMid = Math.floor(nextValue)
          step.heartRate = {
            range: {
              start: Math.max(0, Math.floor(clampedMid - width)),
              end: Math.max(0, Math.floor(clampedMid + width))
            },
            ramp: shouldTreatRangeAsRamp(step, step.heartRate),
            units: step.heartRate.units || 'bpm'
          }
        } else {
          step.heartRate = {
            value: Math.floor(nextValue),
            units: step.heartRate?.units || 'bpm'
          }
        }
      }
      return
    }

    if (selectedMetric === 'power') {
      const nextFactor = clamp(factor, band.low, band.high)
      if (step.power?.range) {
        const width = Math.max(0, (step.power.range.end - step.power.range.start) / 2)
        step.power = {
          range: {
            start: Math.max(0, nextFactor - width),
            end: nextFactor + width
          },
          ramp: shouldTreatRangeAsRamp(step, step.power),
          units: step.power.units || '%'
        }
      } else {
        step.power = { value: nextFactor, units: step.power?.units || '%' }
      }
      return
    }

    if (selectedMetric === 'pace') {
      const nextFactor = clamp(factor, band.low, band.high)
      if (step.pace?.range) {
        const width = Math.max(0, (step.pace.range.end - step.pace.range.start) / 2)
        step.pace = {
          range: {
            start: Math.max(0, nextFactor - width),
            end: nextFactor + width
          },
          ramp: shouldTreatRangeAsRamp(step, step.pace),
          units: step.pace.units || 'Pace'
        }
      } else {
        step.pace = { value: nextFactor, units: step.pace?.units || 'Pace' }
      }
      return
    }

    if (selectedMetric === 'rpe') {
      step.rpe = Math.min(10, Math.max(1, Math.round(clamp(factor, band.low, band.high) * 10)))
      return
    }
  }

  step.intent = inferIntentFromFactor(factor, intent, step?.type)
  if (!step.primaryTarget) step.primaryTarget = selectedMetric
}

export function resolveWorkoutTargeting(
  sportSettings: any,
  override?: WorkoutTargetingOverride | null
) {
  const mergedTargetPolicy = {
    ...(sportSettings?.targetPolicy || {}),
    ...(override?.targetPolicy || {})
  }
  const mergedTargetFormatPolicy = {
    ...(sportSettings?.targetFormatPolicy || {}),
    ...(override?.targetFormatPolicy || {}),
    heartRate: {
      ...(sportSettings?.targetFormatPolicy?.heartRate || {}),
      ...(override?.targetFormatPolicy?.heartRate || {})
    },
    power: {
      ...(sportSettings?.targetFormatPolicy?.power || {}),
      ...(override?.targetFormatPolicy?.power || {})
    },
    pace: {
      ...(sportSettings?.targetFormatPolicy?.pace || {}),
      ...(override?.targetFormatPolicy?.pace || {})
    },
    cadence: {
      ...(sportSettings?.targetFormatPolicy?.cadence || {}),
      ...(override?.targetFormatPolicy?.cadence || {})
    }
  }
  const targetPolicy = normalizeTargetPolicy(
    mergedTargetPolicy,
    override?.loadPreference || sportSettings?.loadPreference
  )
  console.log('[Targeting] Resolved TargetPolicy:', {
    strict: targetPolicy.strictPrimary,
    primary: targetPolicy.primaryMetric,
    fallback: targetPolicy.fallbackOrder
  })
  const targetFormatPolicy = normalizeTargetFormatPolicy(mergedTargetFormatPolicy)

  // Keep explicit single-value targeting authoritative across save/regenerate flows.
  if (targetPolicy.defaultTargetStyle === 'value') {
    targetFormatPolicy.heartRate.preferRange = false
    targetFormatPolicy.power.preferRange = false
    targetFormatPolicy.pace.preferRange = false
  }

  const loadPreference = toLegacyLoadPreference(targetPolicy.fallbackOrder)
  const loadOrderTokens = targetPolicy.fallbackOrder.map(toMetricToken)
  const priorityText = loadOrderTokens.join(' > ')
  return { targetPolicy, targetFormatPolicy, loadPreference, loadOrderTokens, priorityText }
}

export function formatTargetPolicyPrompt(targetPolicy: TargetPolicy, loadPreference: string) {
  const fallbackOrder = targetPolicy.fallbackOrder.map(metricLabel).join(' > ')
  const primaryMetric = metricLabel(targetPolicy.primaryMetric)
  const steadyRangeRule = formatSteadyTargetStyleInstruction(targetPolicy)

  return `- **TARGET POLICY (source: sport settings)**:
  - Legacy order: ${loadPreference}
  - Primary metric: ${primaryMetric}
  - Fallback order: ${fallbackOrder}
  - Strict primary: ${targetPolicy.strictPrimary ? 'enabled' : 'disabled'}
  - Mixed targets in one step: ${targetPolicy.allowMixedTargetsPerStep ? 'allowed' : 'not allowed'}
  - ${steadyRangeRule}`
}

export function formatTargetFormatPolicyPrompt(targetFormatPolicy: TargetFormatPolicy) {
  return `- **TARGET FORMAT POLICY**:
  - Heart Rate: ${targetFormatPolicy.heartRate.mode} (${targetFormatPolicy.heartRate.preferRange ? 'prefer range' : 'single value allowed'})
  - Power: ${targetFormatPolicy.power.mode} (${targetFormatPolicy.power.preferRange ? 'prefer range' : 'single value allowed'})
  - Pace: ${targetFormatPolicy.pace.mode} (${targetFormatPolicy.pace.preferRange ? 'prefer range' : 'single value allowed'})
  - Cadence: ${targetFormatPolicy.cadence.mode}`
}

function toTargetObject(target: any): any {
  if (!target) return null
  if (Array.isArray(target)) {
    if (target.length >= 2)
      return { range: { start: Number(target[0]) || 0, end: Number(target[1]) || 0 } }
    if (target.length === 1) return { value: Number(target[0]) || 0 }
  }
  if (typeof target === 'number') return { value: target }
  if (typeof target === 'object') {
    if (target.range && typeof target.range === 'object') {
      return {
        range: {
          start: Number(target.range.start ?? target.range[0]) || 0,
          end: Number(target.range.end ?? target.range[1]) || 0
        },
        ramp: target.ramp === true,
        units: target.units
      }
    }
    if (target.start !== undefined && target.end !== undefined) {
      return {
        range: { start: Number(target.start) || 0, end: Number(target.end) || 0 },
        ramp: target.ramp === true,
        units: target.units
      }
    }
    if (target.value !== undefined) return { value: Number(target.value) || 0, units: target.units }
  }
  return null
}

function targetMidpoint(target: any): number | null {
  if (!target) return null
  if (typeof target.value === 'number') return target.value
  if (target.range) return (target.range.start + target.range.end) / 2
  return null
}

function applyPreferRange(target: any, preferRange: boolean, spread = 0.02) {
  if (!target) return target
  if (!preferRange || target.range || typeof target.value !== 'number') return target
  const start = Math.max(0, target.value - spread)
  const end = Math.max(start, target.value + spread)
  return { ...target, range: { start, end }, value: undefined }
}

function inferZoneIndexFromBounds(value: number, zones: any[]): number | null {
  if (!Array.isArray(zones) || zones.length === 0 || !Number.isFinite(value)) return null
  const idx = zones.findIndex(
    (z: any) => value >= Number(z.min || 0) && value <= Number(z.max || 0)
  )
  return idx >= 0 ? idx + 1 : null
}

function paceValueToMps(
  value: number,
  units: string | undefined,
  thresholdPace: number
): number | null {
  if (!Number.isFinite(value) || value <= 0) return null
  const normalizedUnits = String(units || '')
    .trim()
    .toLowerCase()

  if (normalizedUnits.includes('/km')) {
    const secondsPerKm = value > 20 ? value : value * 60
    return secondsPerKm > 0 ? 1000 / secondsPerKm : null
  }

  if (normalizedUnits === '%pace' || normalizedUnits === 'percentpace') {
    if (value > 150) return 1000 / value
    if (value > 2 && value <= 20) return 1000 / (value * 60)
  }

  if (normalizedUnits === 'm/s') return value

  // Some model outputs carry absolute running speed while still labeling units as "Pace".
  if (value > 1.5 && value < 8) return value

  if (thresholdPace > 0) {
    if (value > 3) return value / thresholdPace
    return value * thresholdPace
  }

  return null
}

function normalizeHeartRateTarget(
  step: any,
  targetFormatPolicy: TargetFormatPolicy,
  refs: { lthr: number; maxHr: number; hrZones: any[] }
) {
  const original = toTargetObject(step.heartRate)
  if (!original) return
  const target = { ...original }
  const mode = targetFormatPolicy.heartRate.mode
  const lthr = refs.lthr > 0 ? refs.lthr : 160
  const maxHr = refs.maxHr > 0 ? refs.maxHr : 190

  const toBpm = (value: number, units?: string) => {
    const normalizedUnits = String(units || '').toLowerCase()
    if (normalizedUnits === 'lthr') return value > 2 ? (value / 100) * lthr : value * lthr
    if (normalizedUnits === 'hr' || normalizedUnits === 'maxhr') return value * maxHr
    if (normalizedUnits === 'bpm') return value
    if (value > 3) return value
    return value * lthr
  }

  if (mode === 'bpm') {
    if (target.range) {
      target.range = {
        start: Math.round(toBpm(target.range.start, target.units)),
        end: Math.round(toBpm(target.range.end, target.units))
      }
    } else if (typeof target.value === 'number') {
      target.value = Math.round(toBpm(target.value, target.units))
    }
    target.units = 'bpm'
    step.heartRate = target
    return
  }

  if (mode === 'percentMaxHr') {
    if (target.range) {
      target.range = {
        start: Math.max(0, toBpm(target.range.start, target.units) / maxHr),
        end: Math.max(0, toBpm(target.range.end, target.units) / maxHr)
      }
    } else if (typeof target.value === 'number') {
      target.value = Math.max(0, toBpm(target.value, target.units) / maxHr)
    }
    target.units = 'HR'
    step.heartRate = applyPreferRange(target, targetFormatPolicy.heartRate.preferRange)
    return
  }

  if (mode === 'zone') {
    const midpoint = targetMidpoint(target)
    if (midpoint !== null) {
      const bpm = toBpm(midpoint, target.units)
      const zoneIdx = inferZoneIndexFromBounds(bpm, refs.hrZones)
      if (zoneIdx && refs.hrZones[zoneIdx - 1]) {
        const zone = refs.hrZones[zoneIdx - 1]
        target.range = {
          start: Math.round(Number(zone.min || bpm)),
          end: Math.round(Number(zone.max || bpm))
        }
        target.value = undefined
        target.units = 'bpm'
        step.heartRate = target
        return
      }
    }
  }

  // percentLthr (default fallback)
  if (target.range) {
    target.range = {
      start: Math.max(0, toBpm(target.range.start, target.units) / lthr),
      end: Math.max(0, toBpm(target.range.end, target.units) / lthr)
    }
  } else if (typeof target.value === 'number') {
    target.value = Math.max(0, toBpm(target.value, target.units) / lthr)
  }
  target.units = 'LTHR'
  step.heartRate = applyPreferRange(target, targetFormatPolicy.heartRate.preferRange)
}

function normalizePowerTarget(
  step: any,
  targetFormatPolicy: TargetFormatPolicy,
  refs: { ftp: number; powerZones: any[] }
) {
  const original = toTargetObject(step.power)
  if (!original) return
  const target = { ...original }
  const ftp = refs.ftp > 0 ? refs.ftp : 250
  const mode = targetFormatPolicy.power.mode
  const originalUnits = String(original.units || '')
    .trim()
    .toLowerCase()
  const toWatts = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return 0
    if (originalUnits.includes('%')) {
      return (value > 3 ? value / 100 : value) * ftp
    }
    if (originalUnits === 'w' || originalUnits === 'watts') return value
    return value <= 3 ? value * ftp : value
  }

  if (mode === 'watts') {
    if (target.range) {
      target.range = {
        start: Math.round(toWatts(target.range.start)),
        end: Math.round(toWatts(target.range.end))
      }
    } else if (typeof target.value === 'number') {
      target.value = Math.round(toWatts(target.value))
    }
    target.units = 'w'
    step.power = target
    return
  }

  if (mode === 'zone') {
    const midpoint = targetMidpoint(target)
    if (midpoint !== null) {
      const watts = toWatts(midpoint)
      const zoneIdx = inferZoneIndexFromBounds(watts, refs.powerZones)
      if (zoneIdx) {
        target.value = zoneIdx
        target.range = undefined
        target.units = 'power_zone'
        step.power = target
        return
      }
    }
  }

  // percentFtp
  if (target.range) {
    target.range = {
      start: Math.max(0, toWatts(target.range.start) / ftp),
      end: Math.max(0, toWatts(target.range.end) / ftp)
    }
  } else if (typeof target.value === 'number') {
    target.value = Math.max(0, toWatts(target.value) / ftp)
  }
  target.units = '%'
  step.power = applyPreferRange(target, targetFormatPolicy.power.preferRange)
}

function normalizePaceTarget(
  step: any,
  targetFormatPolicy: TargetFormatPolicy,
  refs: { thresholdPace: number; paceZones: any[] }
) {
  const original = toTargetObject(step.pace)
  if (!original) return
  const target = { ...original }
  const thresholdPace = refs.thresholdPace > 0 ? refs.thresholdPace : 0
  const mode = targetFormatPolicy.pace.mode

  if (mode === 'absolutePace' && thresholdPace > 0) {
    const toMinPerKm = (value: number) => {
      const metersPerSecond = paceValueToMps(value, target.units, thresholdPace)
      const secondsPerKm = 1000 / Math.max(0.01, metersPerSecond || thresholdPace)
      return Number((secondsPerKm / 60).toFixed(2))
    }
    if (target.range) {
      target.range = {
        start: toMinPerKm(target.range.start),
        end: toMinPerKm(target.range.end)
      }
    } else if (typeof target.value === 'number') {
      target.value = toMinPerKm(target.value)
    }
    target.units = '/km'
    step.pace = target
    return
  }

  if (mode === 'zone' && Array.isArray(refs.paceZones) && refs.paceZones.length > 0) {
    const midpoint = targetMidpoint(target)
    if (midpoint !== null) {
      const normalizedUnits = String(target.units || '')
        .trim()
        .toLowerCase()
      const explicitZone = normalizedUnits.includes('zone')
        ? Math.max(1, Math.round(midpoint))
        : null
      const paceMps = explicitZone ? null : paceValueToMps(midpoint, target.units, thresholdPace)
      const zoneIdx =
        explicitZone ||
        (paceMps !== null ? inferZoneIndexFromBounds(paceMps, refs.paceZones) : null)
      if (zoneIdx && refs.paceZones[zoneIdx - 1]) {
        const zone = refs.paceZones[zoneIdx - 1]
        target.range = {
          start: Number(zone.min || paceMps || midpoint),
          end: Number(zone.max || paceMps || midpoint)
        }
        target.value = undefined
        target.units = 'm/s'
        step.pace = target
        return
      }
    }
  }

  // percentPace
  if (thresholdPace > 0) {
    const toRelative = (value: number) => {
      const metersPerSecond = paceValueToMps(value, target.units, thresholdPace)
      if (metersPerSecond !== null) return metersPerSecond / thresholdPace
      return value
    }
    if (target.range) {
      target.range = {
        start: Math.max(0, toRelative(target.range.start)),
        end: Math.max(0, toRelative(target.range.end))
      }
    } else if (typeof target.value === 'number') {
      target.value = Math.max(0, toRelative(target.value))
    }
  }
  target.units = 'Pace'
  step.pace = applyPreferRange(target, targetFormatPolicy.pace.preferRange)
}

function normalizeCadenceTarget(step: any, targetFormatPolicy: TargetFormatPolicy) {
  const mode = targetFormatPolicy.cadence.mode
  if (mode === 'none') {
    delete step.cadence
    delete step.cadenceRange
    return
  }
  if (mode === 'rpmRange') {
    if (!step.cadenceRange && typeof step.cadence === 'number') {
      step.cadenceRange = {
        start: Math.max(1, step.cadence - 3),
        end: Math.max(step.cadence, step.cadence + 3)
      }
      delete step.cadence
    }
    return
  }
  // rpm (single value)
  if (!step.cadence && step.cadenceRange) {
    const start = Number(step.cadenceRange.start || 0)
    const end = Number(step.cadenceRange.end || 0)
    if (start > 0 || end > 0) step.cadence = Math.round((start + end) / 2)
    delete step.cadenceRange
  }
}

export function applyTargetPolicyToStep(step: any, targetPolicy: TargetPolicy) {
  console.log('[Targeting] Policy:', {
    primary: targetPolicy.primaryMetric,
    strict: targetPolicy.strictPrimary,
    fallback: targetPolicy.fallbackOrder
  })

  const candidateMetrics: TargetStepMetric[] = targetPolicy.fallbackOrder
    .filter((metric) => ['power', 'heartRate', 'pace', 'rpe'].includes(metric))
    .map((metric) => metric as TargetStepMetric)

  // 1. Determine search order
  const orderedMetrics: TargetStepMetric[] = []
  const policyPrimary = targetPolicy.primaryMetric as TargetStepMetric

  if (targetPolicy.strictPrimary) {
    orderedMetrics.push(policyPrimary)
  } else {
    // If step already has a valid primaryTarget with data, prioritize it when strict primary is off.
    const currentPrimary = step.primaryTarget as TargetStepMetric
    if (currentPrimary && hasMetricTarget(step, currentPrimary)) {
      orderedMetrics.push(currentPrimary)
    }

    // Then add policy primary if not already added
    if (!orderedMetrics.includes(policyPrimary)) {
      orderedMetrics.push(policyPrimary)
    }
  }

  // Then add the rest of the candidates
  candidateMetrics.forEach((m) => {
    if (!orderedMetrics.includes(m)) orderedMetrics.push(m)
  })

  // 2. Find the first metric that actually has data. In strict mode the configured
  // primary remains authoritative even when generation returned only fallback data.
  let selectedMetric = targetPolicy.strictPrimary
    ? policyPrimary
    : orderedMetrics.find((metric) => hasMetricTarget(step, metric))

  console.log(
    '[Targeting] Step:',
    step.name,
    'Ordered:',
    orderedMetrics,
    'Selected:',
    selectedMetric,
    'HasPace:',
    hasMetricTarget(step, 'pace')
  )

  if (!selectedMetric) {
    // Fallback if nothing found: use policy primary or first candidate
    selectedMetric = policyPrimary || candidateMetrics[0] || 'heartRate'
    ensureMetricTarget(step, selectedMetric, defaultMetricValue(step?.type))
  } else {
    // Ensure the selected metric is fully formed
    ensureMetricTarget(step, selectedMetric, defaultMetricValue(step?.type))
  }

  // 3. Enforce single-target if required
  if (targetPolicy.strictPrimary || !targetPolicy.allowMixedTargetsPerStep) {
    removeOtherMetricTargets(step, selectedMetric)
  }

  step.primaryTarget = selectedMetric
}

export const applyRunTargetPolicyToStep = applyTargetPolicyToStep

export function applyTargetFormatPolicyToStep(
  step: any,
  targetFormatPolicy: TargetFormatPolicy,
  refs: {
    ftp: number
    lthr: number
    maxHr: number
    thresholdPace: number
    hrZones: any[]
    powerZones: any[]
    paceZones: any[]
  }
) {
  normalizeHeartRateTarget(step, targetFormatPolicy, {
    lthr: refs.lthr,
    maxHr: refs.maxHr,
    hrZones: refs.hrZones
  })
  normalizePowerTarget(step, targetFormatPolicy, { ftp: refs.ftp, powerZones: refs.powerZones })
  normalizePaceTarget(step, targetFormatPolicy, {
    thresholdPace: refs.thresholdPace,
    paceZones: refs.paceZones
  })
  normalizeCadenceTarget(step, targetFormatPolicy)
}

export function buildPlannedWorkoutSettingsSnapshot(
  sportSettings: any,
  resolvedMetrics: { ftp: number; lthr: number; maxHr: number },
  targetPolicy: TargetPolicy,
  targetFormatPolicy: TargetFormatPolicy
) {
  return {
    version: 1,
    capturedAt: new Date().toISOString(),
    profile: {
      id: sportSettings?.id || null,
      name: sportSettings?.name || null,
      source: sportSettings?.source || null,
      externalId: sportSettings?.externalId || null,
      types: Array.isArray(sportSettings?.types) ? [...sportSettings.types] : [],
      isDefault: Boolean(sportSettings?.isDefault)
    },
    thresholds: {
      ftp: resolvedMetrics.ftp || null,
      lthr: resolvedMetrics.lthr || null,
      maxHr: resolvedMetrics.maxHr || null,
      restingHr: sportSettings?.restingHr || null,
      thresholdPace: sportSettings?.thresholdPace || null
    },
    defaults: {
      warmupTime: sportSettings?.warmupTime || null,
      cooldownTime: sportSettings?.cooldownTime || null,
      hrLoadType: sportSettings?.hrLoadType || null
    },
    zones: {
      power: cloneZones(sportSettings?.powerZones),
      heartRate: cloneZones(sportSettings?.hrZones),
      pace: cloneZones(sportSettings?.paceZones)
    },
    loadPreference: toLegacyLoadPreference(targetPolicy.fallbackOrder),
    targetPolicy,
    targetFormatPolicy
  }
}

export function buildPlannedWorkoutGenerationContext(input: {
  operation: 'generate' | 'adjust'
  generatorMode?: string
  workout: any
  targetPolicy: TargetPolicy
  targetFormatPolicy: TargetFormatPolicy
  loadPreference: string
  timezone: string
  model: string
  recentWorkoutsCount: number
  goal?: string
  phase?: string
  focus?: string
  persona?: string
  adjustments?: any
}) {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    operation: input.operation,
    generatorMode: input.generatorMode || 'legacy_json',
    model: input.model,
    timezone: input.timezone,
    workout: {
      id: input.workout?.id,
      type: input.workout?.type || null,
      title: input.workout?.title || null,
      date: input.workout?.date ? new Date(input.workout.date).toISOString() : null,
      durationSec: input.workout?.durationSec || null,
      intensity: input.workout?.workIntensity || null
    },
    context: {
      goal: input.goal || null,
      phase: input.phase || null,
      focus: input.focus || null,
      persona: input.persona || null,
      recentWorkoutsCount: input.recentWorkoutsCount
    },
    targeting: {
      loadPreference: input.loadPreference,
      targetPolicy: input.targetPolicy,
      targetFormatPolicy: input.targetFormatPolicy
    },
    adjustments: input.adjustments || null
  }
}
