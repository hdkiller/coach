import {
  adaptStructuredWorkout,
  type CanonicalStructuredWorkout,
  type StructureSource,
  type ZoneProfileSnapshot
} from '../../shared/structured-workout-contract'
import {
  validateCanonicalForDestination,
  type WorkoutDestination
} from '../../shared/workout-support-matrix'
import { WorkoutConverter } from './workout-converter'
import { buildGarminTrainingPayload } from './garmin-push'
import {
  resolveWorkoutExportContext,
  type PlannedWorkoutExportSource
} from './workout-export-settings'

type ConverterWorkout = Parameters<typeof WorkoutConverter.toZWO>[0]

export type WorkoutExportDestination =
  'intervals' | 'garmin' | 'rouvy' | 'zwo' | 'fit' | 'mrc' | 'erg'

const DOWNLOAD_DESTINATIONS = new Set<WorkoutExportDestination>(['zwo', 'fit', 'mrc', 'erg'])

function mapExportDestination(destination: WorkoutExportDestination): WorkoutDestination {
  if (destination === 'rouvy') return 'rouvy'
  if (destination === 'garmin') return 'garmin'
  if (DOWNLOAD_DESTINATIONS.has(destination)) return destination
  return 'intervals'
}

function converterStep(step: any): any {
  if (!step || typeof step !== 'object') return step
  const result: any = { ...step }
  const pace = result.pace
  if (pace?.metric === 'pace' && pace?.rangeMps) {
    result.pace = {
      range: { start: pace.rangeMps.min, end: pace.rangeMps.max },
      units: 'm/s',
      ramp: pace.ramp === true
    }
  }
  if (Array.isArray(result.steps)) result.steps = result.steps.map(converterStep)
  return result
}

export function canonicalizeForProvider(
  structure: unknown,
  options: { source?: StructureSource; zoneProfileSnapshot?: ZoneProfileSnapshot } = {}
): CanonicalStructuredWorkout {
  const canonical = adaptStructuredWorkout(structure, options)
  if (!canonical) throw createError({ statusCode: 400, message: 'Invalid structured workout' })
  if ((canonical.diagnostics || []).length > 0) {
    throw createError({
      statusCode: 422,
      message: 'Workout has unresolved targets and cannot be exported.',
      data: { diagnostics: canonical.diagnostics }
    })
  }
  return canonical
}

export type CanonicalExportOptions = {
  destination: WorkoutExportDestination
  title: string
  description: string
  type?: string | null
  /** @deprecated Prefer `workout` so export uses frozen generation snapshots. */
  ftp?: number | null
  structure: unknown
  zoneProfileSnapshot?: ZoneProfileSnapshot
  durationSec?: number | null
  distanceMeters?: number | null
  workout?: PlannedWorkoutExportSource | null
  liveSportSettings?: any | null
  liveUserFtp?: number | null
}

function buildConverterWorkout(
  canonical: CanonicalStructuredWorkout,
  options: CanonicalExportOptions,
  exportContext: ReturnType<typeof resolveWorkoutExportContext>
): ConverterWorkout {
  return {
    title: options.title,
    description: options.description,
    ftp: exportContext.ftp,
    steps: canonical.steps.map(converterStep),
    exercises: canonical.exercises,
    messages: canonical.messages,
    sportSettings: exportContext.sportSettings as ConverterWorkout['sportSettings'],
    generationSettingsSnapshot:
      exportContext.generationSettingsSnapshot as ConverterWorkout['generationSettingsSnapshot']
  }
}

/** Single export adapter for Intervals, Garmin, Rouvy, and device download formats. */
export function serializeCanonicalForProvider(
  options: CanonicalExportOptions
): string | Uint8Array | Record<string, unknown> {
  const canonical = canonicalizeForProvider(options.structure, {
    zoneProfileSnapshot: options.zoneProfileSnapshot
  })

  const destinationIssues = validateCanonicalForDestination(
    canonical,
    options.type,
    mapExportDestination(options.destination)
  )
  if (destinationIssues.length > 0) {
    throw createError({
      statusCode: 422,
      message: destinationIssues[0]!.message,
      data: { issues: destinationIssues }
    })
  }

  const exportContext = resolveWorkoutExportContext({
    workout: options.workout,
    liveSportSettings: options.liveSportSettings,
    liveUserFtp: options.liveUserFtp,
    explicitFtp: options.ftp
  })
  const generationSettingsSnapshot =
    exportContext.generationSettingsSnapshot ||
    ({
      thresholds: {
        ftp: exportContext.ftp,
        lthr: exportContext.sportSettings?.lthr ?? null,
        thresholdPace:
          exportContext.sportSettings?.thresholdPace ??
          canonical.zoneProfileSnapshot.pace?.thresholdMps ??
          null
      },
      zones: {
        pace: canonical.zoneProfileSnapshot.pace?.ranges || [],
        heartRate: canonical.zoneProfileSnapshot.heartRate?.ranges || [],
        power: canonical.zoneProfileSnapshot.power?.ranges || []
      },
      targetPolicy: exportContext.sportSettings?.targetPolicy ?? null,
      loadPreference: exportContext.sportSettings?.loadPreference ?? null
    } as Record<string, unknown>)
  const workout = buildConverterWorkout(canonical, options, {
    ...exportContext,
    generationSettingsSnapshot
  })

  switch (options.destination) {
    case 'intervals':
      return WorkoutConverter.toIntervalsICU({
        ...workout,
        type: options.type || undefined
      })
    case 'garmin':
      return buildGarminTrainingPayload({
        title: options.title,
        description: options.description,
        type: options.type,
        durationSec: options.durationSec,
        distanceMeters: options.distanceMeters,
        steps: workout.steps
      })
    case 'rouvy':
    case 'zwo':
      return WorkoutConverter.toZWO(workout)
    case 'fit':
      return WorkoutConverter.toFIT(workout)
    case 'mrc':
      return WorkoutConverter.toMRC(workout)
    case 'erg':
      return WorkoutConverter.toERG(workout)
    default:
      throw createError({ statusCode: 400, message: 'Unsupported export destination' })
  }
}

export function serializeCanonicalForIntervals(options: {
  title: string
  description: string
  type?: string | null
  ftp?: number | null
  structure: unknown
  zoneProfileSnapshot?: ZoneProfileSnapshot
  workout?: PlannedWorkoutExportSource | null
  liveSportSettings?: any | null
  liveUserFtp?: number | null
}) {
  return serializeCanonicalForProvider({
    destination: 'intervals',
    ...options
  }) as string
}

export function serializeCanonicalForGarmin(options: {
  title: string
  description: string
  type?: string | null
  structure: unknown
  zoneProfileSnapshot?: ZoneProfileSnapshot
  durationSec?: number | null
  distanceMeters?: number | null
  workout?: PlannedWorkoutExportSource | null
  liveSportSettings?: any | null
  liveUserFtp?: number | null
}) {
  return serializeCanonicalForProvider({
    destination: 'garmin',
    ...options
  }) as Record<string, unknown>
}

export function serializeCanonicalDownload(options: {
  title: string
  description: string
  ftp?: number | null
  structure: unknown
  zoneProfileSnapshot?: ZoneProfileSnapshot
  format: 'zwo' | 'fit' | 'mrc' | 'erg'
  workout?: PlannedWorkoutExportSource | null
  liveSportSettings?: any | null
  liveUserFtp?: number | null
}) {
  return serializeCanonicalForProvider({
    destination: options.format,
    title: options.title,
    description: options.description,
    ftp: options.ftp,
    structure: options.structure,
    zoneProfileSnapshot: options.zoneProfileSnapshot,
    workout: options.workout,
    liveSportSettings: options.liveSportSettings,
    liveUserFtp: options.liveUserFtp
  })
}
