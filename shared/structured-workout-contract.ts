/**
 * Pure structured-workout contract helpers shared by server, Trigger tasks, and the UI.
 * Canonical pace is metres per second. Callers must not infer an unknown unit from a
 * numeric value: returning `null` means the target is unresolved.
 */

export const STRUCTURED_WORKOUT_SCHEMA_VERSION = 1
export const DEFAULT_WORKOUT_LIMITS = {
  maxDepth: 8,
  maxRepeat: 50,
  maxExpandedSteps: 500,
  maxDurationSeconds: 24 * 60 * 60,
  maxSteps: 250
} as const

export type ZoneRange = { min: number; max: number; name?: string }
export type ZoneProfileSnapshot = {
  pace?: { unit: 'm/s'; ranges: ZoneRange[]; thresholdMps?: number }
  power?: { unit: 'watts'; ranges: ZoneRange[] }
  heartRate?: { unit: 'bpm'; ranges: ZoneRange[] }
}

export type StructureSource =
  'INTERVALS_IMPORT' | 'AI_GENERATION' | 'MANUAL_EDIT' | 'TEMPLATE' | 'LEGACY_ADAPTER'

/**
 * The persisted representation of a structured workout.  `steps` intentionally
 * remains compatible with the existing step grammar; target values inside those
 * steps are progressively canonicalised.  Keeping the envelope separate lets us
 * read old records without rewriting them during a deploy.
 */
export type CanonicalStructuredWorkout = {
  schemaVersion: typeof STRUCTURED_WORKOUT_SCHEMA_VERSION
  source: StructureSource
  targetUnits: { pace: 'm/s'; duration: 'seconds'; distance: 'meters' }
  zoneProfileSnapshot: ZoneProfileSnapshot
  steps: any[]
  exercises?: any[]
  blocks?: any[]
  messages?: any[]
  diagnostics?: WorkoutContractIssue[]
}

export type WorkoutContractIssue = {
  code:
    | 'unknown_pace_unit'
    | 'invalid_pace_value'
    | 'invalid_zone'
    | 'max_depth_exceeded'
    | 'max_repeat_exceeded'
    | 'max_steps_exceeded'
    | 'max_duration_exceeded'
    | 'legacy_structure'
  path: string
  message: string
}

export function isCanonicalStructuredWorkout(value: unknown): value is CanonicalStructuredWorkout {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as any).schemaVersion === STRUCTURED_WORKOUT_SCHEMA_VERSION &&
    !!(value as any).targetUnits &&
    !!(value as any).zoneProfileSnapshot
  )
}

function finitePositive(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizedUnit(unit: unknown): string {
  return String(unit || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

/** Converts an explicitly-declared pace to m/s. */
export function paceToMps(value: unknown, unit: unknown): number | null {
  const pace = finitePositive(value)
  if (pace === null) return null

  switch (normalizedUnit(unit)) {
    case 'm/s':
    case 'mps':
    case 'metres/second':
    case 'meters/second':
      return pace
    case 'm/min':
    case 'mpm':
    case 'metres/minute':
    case 'meters/minute':
      return pace / 60
    case '/km':
    case 'min/km':
    case 'minutes/km':
      return 1000 / (pace * 60)
    case 's/km':
    case 'sec/km':
    case 'seconds/km':
      return 1000 / pace
    default:
      return null
  }
}

export function paceTargetToCanonical(
  target: any,
  snapshot?: ZoneProfileSnapshot
): { target: any | null; issue?: WorkoutContractIssue } {
  if (!target || typeof target !== 'object') return { target: null }
  const unit = normalizedUnit(target.units)
  const range = target.range

  if (unit === 'pace_zone' || unit === 'zone') {
    const rawZone = range
      ? Math.round((Number(range.start) + Number(range.end)) / 2)
      : Math.round(Number(target.value))
    const zones = snapshot?.pace?.ranges || []
    const zone = zones[rawZone - 1]
    if (!zone || !Number.isFinite(zone.min) || !Number.isFinite(zone.max)) {
      return {
        target: null,
        issue: {
          code: 'invalid_zone',
          path: 'pace',
          message: 'Pace zone cannot be resolved without a captured pace-zone profile.'
        }
      }
    }
    return {
      target: {
        metric: 'pace',
        kind: 'zone',
        zone: rawZone,
        rangeMps: { min: zone.min, max: zone.max },
        // Compatibility projection for existing renderers. The persisted source of
        // truth is rangeMps; this projection is explicit m/s, never inferred.
        range: { start: zone.min, end: zone.max },
        units: 'm/s',
        sourceUnit: unit
      }
    }
  }

  // Relative pace is only valid when the captured snapshot carries the threshold
  // it refers to. It is not inferred from an arbitrary numeric magnitude.
  if (unit === 'pace' || unit === '%pace' || unit === '%' || unit === 'threshold_pace') {
    const threshold = finitePositive(snapshot?.pace?.thresholdMps)
    const relative = range
      ? {
          min: finitePositive(range.start),
          max: finitePositive(range.end)
        }
      : { min: finitePositive(target.value), max: finitePositive(target.value) }
    if (threshold && relative.min !== null && relative.max !== null) {
      const min = relative.min > 3 ? relative.min / 100 : relative.min
      const max = relative.max > 3 ? relative.max / 100 : relative.max
      return {
        target: {
          metric: 'pace',
          kind: 'relative',
          relativeToThreshold: { min, max },
          rangeMps: { min: min * threshold, max: max * threshold },
          range: { start: min * threshold, end: max * threshold },
          units: 'm/s',
          sourceUnit: unit
        }
      }
    }
  }

  const convert = (value: unknown) => paceToMps(value, unit)
  if (range && typeof range === 'object') {
    const min = convert(range.start)
    const max = convert(range.end)
    if (min !== null && max !== null) {
      return {
        target: {
          metric: 'pace',
          kind: 'absolute',
          rangeMps: { min, max },
          range: { start: min, end: max },
          units: 'm/s',
          sourceUnit: unit
        }
      }
    }
  } else {
    const mps = convert(target.value)
    if (mps !== null) {
      return {
        target: {
          metric: 'pace',
          kind: 'absolute',
          rangeMps: { min: mps, max: mps },
          range: { start: mps, end: mps },
          units: 'm/s',
          sourceUnit: unit
        }
      }
    }
  }

  return {
    target: null,
    issue: {
      code: unit ? 'unknown_pace_unit' : 'invalid_pace_value',
      path: 'pace',
      message: unit
        ? `Unsupported or unresolved pace unit: ${String(target.units)}`
        : 'Pace target has no declared unit.'
    }
  }
}

export function createZoneProfileSnapshot(settings: any): ZoneProfileSnapshot {
  const copyZones = (zones: unknown): ZoneRange[] =>
    Array.isArray(zones)
      ? zones
          .map((zone: any) => ({
            min: Number(zone?.min),
            max: Number(zone?.max),
            name: zone?.name
          }))
          .filter((zone) => Number.isFinite(zone.min) && Number.isFinite(zone.max))
      : []

  return {
    pace: {
      unit: 'm/s',
      ranges: copyZones(settings?.paceZones),
      ...(finitePositive(settings?.thresholdPace)
        ? { thresholdMps: Number(settings.thresholdPace) }
        : {})
    },
    power: { unit: 'watts', ranges: copyZones(settings?.powerZones) },
    heartRate: { unit: 'bpm', ranges: copyZones(settings?.hrZones) }
  }
}

type NormalizedStepPaceResult = { step: any; issues: WorkoutContractIssue[] }

function normalizeStepPaceTargets(
  step: any,
  snapshot: ZoneProfileSnapshot,
  path: string
): NormalizedStepPaceResult {
  if (!step || typeof step !== 'object') return { step, issues: [] as WorkoutContractIssue[] }
  const copy: any = { ...step }
  const issues: WorkoutContractIssue[] = []
  if (copy.pace && typeof copy.pace === 'object') {
    // Canonical targets are deliberately not converted again.
    if (copy.pace.metric === 'pace' && copy.pace.rangeMps) {
      copy.pace = { ...copy.pace, units: 'm/s' }
    } else {
      const result = paceTargetToCanonical(copy.pace, snapshot)
      if (result.target) copy.pace = result.target
      else if (result.issue) {
        // Preserve unknown legacy input for audit/display, but make it impossible
        // for charts and exporters to mistake it for a speed.
        copy.pace = { metric: 'pace', kind: 'freeform', raw: copy.pace, unresolved: true }
        issues.push({ ...result.issue, path: `${path}.pace` })
      }
    }
  }
  if (Array.isArray(copy.steps)) {
    const nested = copy.steps.map((child: any, index: number) =>
      normalizeStepPaceTargets(child, snapshot, `${path}.steps[${index}]`)
    )
    copy.steps = nested.map((entry: NormalizedStepPaceResult) => entry.step)
    issues.push(...nested.flatMap((entry: NormalizedStepPaceResult) => entry.issues))
  }
  return { step: copy, issues }
}

/**
 * Dual-read adapter. It never guesses a pace unit from magnitude. Legacy values
 * that lack a declared unit are retained as unresolved freeform targets.
 */
export function adaptStructuredWorkout(
  structure: unknown,
  options: { source?: StructureSource; zoneProfileSnapshot?: ZoneProfileSnapshot } = {}
): CanonicalStructuredWorkout | null {
  if (!structure || typeof structure !== 'object') return null
  const input: any = structure
  if (isCanonicalStructuredWorkout(input)) return input

  const snapshot = options.zoneProfileSnapshot || createZoneProfileSnapshot({})
  const normalized = Array.isArray(input.steps)
    ? input.steps.map((step: any, index: number) =>
        normalizeStepPaceTargets(step, snapshot, `steps[${index}]`)
      )
    : []
  const diagnostics = normalized.flatMap((entry: NormalizedStepPaceResult) => entry.issues)
  if (input.steps && !Array.isArray(input.steps)) {
    diagnostics.push({
      code: 'legacy_structure',
      path: 'steps',
      message: 'Legacy workout has an invalid steps payload.'
    })
  }
  return {
    schemaVersion: STRUCTURED_WORKOUT_SCHEMA_VERSION,
    source: options.source || 'LEGACY_ADAPTER',
    targetUnits: { pace: 'm/s', duration: 'seconds', distance: 'meters' },
    zoneProfileSnapshot: snapshot,
    steps: normalized.map((entry: NormalizedStepPaceResult) => entry.step),
    ...(Array.isArray(input.exercises) ? { exercises: input.exercises } : {}),
    ...(Array.isArray(input.blocks) ? { blocks: input.blocks } : {}),
    ...(Array.isArray(input.messages) ? { messages: input.messages } : {}),
    ...(diagnostics.length > 0 ? { diagnostics } : {})
  }
}

/** A stable input for all charts, detail views, and provider serializers. */
export function toStructuredWorkoutRenderModel(structure: unknown) {
  const canonical = adaptStructuredWorkout(structure)
  return canonical
    ? { ...canonical, unresolved: (canonical.diagnostics || []).length > 0 }
    : {
        schemaVersion: STRUCTURED_WORKOUT_SCHEMA_VERSION,
        steps: [],
        unresolved: true,
        diagnostics: []
      }
}

/** Protects recursive normalizers, charts, and exporters from pathological input. */
export function validateStructuredWorkoutLimits(
  structure: any,
  limits = DEFAULT_WORKOUT_LIMITS
): WorkoutContractIssue[] {
  const issues: WorkoutContractIssue[] = []
  let leafSteps = 0
  let expandedSteps = 0

  const visit = (steps: unknown, depth: number, multiplier: number, path: string) => {
    if (!Array.isArray(steps) || issues.length > 0) return
    if (depth > limits.maxDepth) {
      issues.push({
        code: 'max_depth_exceeded',
        path,
        message: `Workout nesting exceeds ${limits.maxDepth}.`
      })
      return
    }
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index]
      const stepPath = `${path}[${index}]`
      leafSteps += 1
      if (leafSteps > limits.maxSteps) {
        issues.push({
          code: 'max_steps_exceeded',
          path: stepPath,
          message: `Workout has more than ${limits.maxSteps} steps.`
        })
        return
      }
      const reps = Math.max(
        1,
        Math.trunc(Number((step as any)?.reps ?? (step as any)?.repeat ?? 1))
      )
      if (!Number.isFinite(reps) || reps > limits.maxRepeat) {
        issues.push({
          code: 'max_repeat_exceeded',
          path: stepPath,
          message: `Step repeats must be between 1 and ${limits.maxRepeat}.`
        })
        return
      }
      const nested = (step as any)?.steps
      if (Array.isArray(nested) && nested.length > 0) {
        visit(nested, depth + 1, multiplier * reps, `${stepPath}.steps`)
      } else {
        expandedSteps += multiplier * reps
        if (expandedSteps > limits.maxExpandedSteps) {
          issues.push({
            code: 'max_steps_exceeded',
            path: stepPath,
            message: `Workout expands to more than ${limits.maxExpandedSteps} steps.`
          })
          return
        }
        const duration = Number((step as any)?.durationSeconds ?? (step as any)?.duration ?? 0)
        if (Number.isFinite(duration) && duration > limits.maxDurationSeconds) {
          issues.push({
            code: 'max_duration_exceeded',
            path: stepPath,
            message: 'Step duration is too large.'
          })
          return
        }
      }
    }
  }

  visit(structure?.steps, 1, 1, 'steps')
  return issues
}
