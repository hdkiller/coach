/**
 * Sport/target/destination acceptance matrix for canonical structured workouts.
 * Each cell documents whether a combination is supported end-to-end.
 */
export type SupportLevel = 'canonical' | 'converted' | 'display_only' | 'provider_raw' | 'rejected'

export type WorkoutSport = 'ride' | 'run' | 'swim' | 'strength' | 'other'
export type TargetKind = 'power' | 'heartRate' | 'pace' | 'cadence' | 'rpe' | 'freeform'
export type WorkoutDestination =
  'editor' | 'chart' | 'share' | 'intervals' | 'garmin' | 'rouvy' | 'zwo' | 'fit' | 'mrc' | 'erg'

type MatrixCell = Partial<Record<WorkoutDestination, SupportLevel>>

const RIDE_TARGETS: Record<TargetKind, MatrixCell> = {
  power: {
    editor: 'canonical',
    chart: 'canonical',
    share: 'canonical',
    intervals: 'canonical',
    garmin: 'canonical',
    rouvy: 'canonical',
    zwo: 'canonical',
    fit: 'canonical',
    mrc: 'canonical',
    erg: 'canonical'
  },
  heartRate: {
    editor: 'canonical',
    chart: 'canonical',
    share: 'canonical',
    intervals: 'canonical',
    garmin: 'converted',
    rouvy: 'display_only',
    zwo: 'converted',
    fit: 'converted',
    mrc: 'rejected',
    erg: 'rejected'
  },
  pace: {
    editor: 'display_only',
    chart: 'display_only',
    share: 'display_only',
    intervals: 'rejected',
    garmin: 'rejected',
    rouvy: 'rejected',
    zwo: 'rejected',
    fit: 'rejected',
    mrc: 'rejected',
    erg: 'rejected'
  },
  cadence: {
    editor: 'canonical',
    chart: 'display_only',
    share: 'display_only',
    intervals: 'converted',
    garmin: 'converted',
    rouvy: 'display_only',
    zwo: 'display_only',
    fit: 'display_only',
    mrc: 'rejected',
    erg: 'rejected'
  },
  rpe: {
    editor: 'canonical',
    chart: 'display_only',
    share: 'display_only',
    intervals: 'converted',
    garmin: 'display_only',
    rouvy: 'display_only',
    zwo: 'display_only',
    fit: 'display_only',
    mrc: 'rejected',
    erg: 'rejected'
  },
  freeform: {
    editor: 'provider_raw',
    chart: 'display_only',
    share: 'display_only',
    intervals: 'converted',
    garmin: 'display_only',
    rouvy: 'display_only',
    zwo: 'display_only',
    fit: 'display_only',
    mrc: 'rejected',
    erg: 'rejected'
  }
}

const RUN_TARGETS: Record<TargetKind, MatrixCell> = {
  power: RIDE_TARGETS.power,
  heartRate: {
    editor: 'canonical',
    chart: 'canonical',
    share: 'canonical',
    intervals: 'canonical',
    garmin: 'converted',
    rouvy: 'rejected',
    zwo: 'rejected',
    fit: 'converted',
    mrc: 'rejected',
    erg: 'rejected'
  },
  pace: {
    editor: 'canonical',
    chart: 'canonical',
    share: 'canonical',
    intervals: 'canonical',
    garmin: 'converted',
    rouvy: 'rejected',
    zwo: 'rejected',
    fit: 'converted',
    mrc: 'rejected',
    erg: 'rejected'
  },
  cadence: {
    editor: 'canonical',
    chart: 'display_only',
    share: 'display_only',
    intervals: 'converted',
    garmin: 'converted',
    rouvy: 'rejected',
    zwo: 'rejected',
    fit: 'display_only',
    mrc: 'rejected',
    erg: 'rejected'
  },
  rpe: RIDE_TARGETS.rpe,
  freeform: RIDE_TARGETS.freeform
}

const SWIM_TARGETS: Record<TargetKind, MatrixCell> = {
  power: { editor: 'rejected', chart: 'rejected', share: 'rejected', intervals: 'rejected' },
  heartRate: {
    editor: 'canonical',
    chart: 'canonical',
    share: 'canonical',
    intervals: 'converted',
    garmin: 'display_only',
    rouvy: 'rejected',
    zwo: 'rejected',
    fit: 'display_only',
    mrc: 'rejected',
    erg: 'rejected'
  },
  pace: {
    editor: 'canonical',
    chart: 'canonical',
    share: 'canonical',
    intervals: 'converted',
    garmin: 'display_only',
    rouvy: 'rejected',
    zwo: 'rejected',
    fit: 'display_only',
    mrc: 'rejected',
    erg: 'rejected'
  },
  cadence: { editor: 'display_only', chart: 'display_only', share: 'display_only' },
  rpe: {
    editor: 'canonical',
    chart: 'display_only',
    share: 'display_only',
    intervals: 'converted',
    garmin: 'display_only',
    rouvy: 'rejected',
    zwo: 'rejected',
    fit: 'display_only',
    mrc: 'rejected',
    erg: 'rejected'
  },
  freeform: {
    editor: 'provider_raw',
    chart: 'display_only',
    share: 'display_only',
    intervals: 'converted',
    garmin: 'display_only',
    rouvy: 'rejected',
    zwo: 'rejected',
    fit: 'display_only',
    mrc: 'rejected',
    erg: 'rejected'
  }
}

const STRENGTH_TARGETS: Record<TargetKind, MatrixCell> = {
  power: { editor: 'rejected', chart: 'rejected', share: 'rejected', intervals: 'rejected' },
  heartRate: { editor: 'display_only', chart: 'display_only', share: 'display_only' },
  pace: { editor: 'rejected', chart: 'rejected', share: 'rejected', intervals: 'rejected' },
  cadence: { editor: 'rejected', chart: 'rejected', share: 'rejected', intervals: 'rejected' },
  rpe: {
    editor: 'canonical',
    chart: 'display_only',
    share: 'display_only',
    intervals: 'converted',
    garmin: 'rejected',
    rouvy: 'rejected',
    zwo: 'rejected',
    fit: 'rejected',
    mrc: 'rejected',
    erg: 'rejected'
  },
  freeform: {
    editor: 'provider_raw',
    chart: 'display_only',
    share: 'display_only',
    intervals: 'converted',
    garmin: 'rejected',
    rouvy: 'rejected',
    zwo: 'rejected',
    fit: 'rejected',
    mrc: 'rejected',
    erg: 'rejected'
  }
}

export const WORKOUT_SUPPORT_MATRIX: Record<WorkoutSport, Record<TargetKind, MatrixCell>> = {
  ride: RIDE_TARGETS,
  run: RUN_TARGETS,
  swim: SWIM_TARGETS,
  strength: STRENGTH_TARGETS,
  other: RUN_TARGETS
}

export function normalizeWorkoutSport(type?: string | null): WorkoutSport {
  const normalized = String(type || '')
    .trim()
    .toLowerCase()
  if (
    normalized.includes('ride') ||
    normalized.includes('bike') ||
    normalized.includes('cycle') ||
    normalized === 'virtualride'
  ) {
    return 'ride'
  }
  if (normalized.includes('run') || normalized.includes('walk') || normalized === 'trailrun') {
    return 'run'
  }
  if (normalized.includes('swim')) return 'swim'
  if (
    normalized.includes('gym') ||
    normalized.includes('weight') ||
    normalized.includes('strength')
  ) {
    return 'strength'
  }
  return 'other'
}

export function getSupportLevel(
  sport: WorkoutSport,
  target: TargetKind,
  destination: WorkoutDestination
): SupportLevel {
  return WORKOUT_SUPPORT_MATRIX[sport]?.[target]?.[destination] || 'rejected'
}

export function destinationAllowsExport(level: SupportLevel): boolean {
  return level === 'canonical' || level === 'converted'
}

export function detectStepTargetKinds(step: any): TargetKind[] {
  const kinds: TargetKind[] = []
  if (step?.power) kinds.push('power')
  if (step?.heartRate || step?.hr) kinds.push('heartRate')
  if (step?.pace) kinds.push('pace')
  if (step?.cadence) kinds.push('cadence')
  if (step?.rpe) kinds.push('rpe')
  if (!kinds.length && (step?.text || step?.note || step?.description)) kinds.push('freeform')
  return kinds.length ? kinds : ['freeform']
}

export type DestinationValidationIssue = {
  path: string
  target: TargetKind
  level: SupportLevel
  message: string
}

/** Validates whether canonical steps can be exported to a destination. */
export function validateCanonicalForDestination(
  structure: { steps?: any[]; exercises?: any[]; blocks?: any[] },
  sportType: string | null | undefined,
  destination: WorkoutDestination
): DestinationValidationIssue[] {
  const sport = normalizeWorkoutSport(sportType)
  const issues: DestinationValidationIssue[] = []

  // Strength exports are driven by native strength structures (`blocks` / `exercises`), not
  // interval-style `steps`. When blocks/exercises exist, step-level target validation can
  // falsely block exports (e.g. leftover steps from legacy normalization).
  if (sport === 'strength' && (structure.exercises?.length || structure.blocks?.length)) {
    return []
  }

  const visit = (steps: any[] | undefined, path: string) => {
    if (!Array.isArray(steps)) return
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index]
      const stepPath = `${path}[${index}]`
      if (Array.isArray(step?.steps) && step.steps.length > 0) {
        visit(step.steps, `${stepPath}.steps`)
        continue
      }
      for (const target of detectStepTargetKinds(step)) {
        const level = getSupportLevel(sport, target, destination)
        if (!destinationAllowsExport(level)) {
          issues.push({
            path: stepPath,
            target,
            level,
            message: `${target} targets are ${level} for ${sport} exports to ${destination}`
          })
        }
      }
    }
  }

  visit(structure.steps, 'steps')

  return issues
}
