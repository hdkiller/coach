import { createZoneProfileSnapshot } from '../../shared/structured-workout-contract'

export type PlannedWorkoutExportSource = {
  lastGenerationSettingsSnapshot?: unknown
  createdFromSettingsSnapshot?: unknown
  structuredWorkout?: unknown
  user?: { ftp?: number | null } | null
}

export type WorkoutExportContext = {
  ftp: number
  generationSettingsSnapshot: Record<string, unknown> | null
  sportSettings: Record<string, unknown> | null
}

function asSnapshot(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function snapshotFromZoneProfile(structure: unknown): Record<string, unknown> | null {
  const zoneProfileSnapshot = (structure as any)?.zoneProfileSnapshot
  if (!zoneProfileSnapshot || typeof zoneProfileSnapshot !== 'object') return null
  return {
    thresholds: {
      thresholdPace: zoneProfileSnapshot.pace?.thresholdMps ?? null,
      lthr: null,
      ftp: null,
      maxHr: null
    },
    zones: {
      pace: zoneProfileSnapshot.pace?.ranges || [],
      heartRate: zoneProfileSnapshot.heartRate?.ranges || [],
      power: zoneProfileSnapshot.power?.ranges || []
    }
  }
}

/** Resolves frozen export thresholds from generation snapshots, not live user settings. */
export function resolveWorkoutExportContext(input: {
  workout?: PlannedWorkoutExportSource | null
  liveSportSettings?: any | null
  liveUserFtp?: number | null
  explicitFtp?: number | null
}): WorkoutExportContext {
  const snapshot =
    asSnapshot(input.workout?.lastGenerationSettingsSnapshot) ||
    asSnapshot(input.workout?.createdFromSettingsSnapshot) ||
    snapshotFromZoneProfile(input.workout?.structuredWorkout)

  const thresholds = (snapshot?.thresholds as Record<string, unknown> | undefined) || {}
  const ftp =
    Number(thresholds.ftp) ||
    Number(input.explicitFtp) ||
    Number(input.liveSportSettings?.ftp) ||
    Number(input.workout?.user?.ftp) ||
    Number(input.liveUserFtp) ||
    250

  const sportSettings = snapshot
    ? {
        loadPreference: snapshot.loadPreference ?? null,
        targetPolicy: snapshot.targetPolicy ?? null,
        intervalsHrRangeTolerancePct: (snapshot as any).intervalsHrRangeTolerancePct ?? null,
        lthr: thresholds.lthr ?? null,
        thresholdPace: thresholds.thresholdPace ?? null,
        hrZones: (snapshot.zones as any)?.heartRate || [],
        paceZones: (snapshot.zones as any)?.pace || []
      }
    : input.liveSportSettings
      ? {
          loadPreference: input.liveSportSettings.loadPreference ?? null,
          targetPolicy: input.liveSportSettings.targetPolicy ?? null,
          intervalsHrRangeTolerancePct:
            input.liveSportSettings.intervalsHrRangeTolerancePct ?? null,
          lthr: input.liveSportSettings.lthr ?? null,
          thresholdPace: input.liveSportSettings.thresholdPace ?? null,
          hrZones: input.liveSportSettings.hrZones || [],
          paceZones: input.liveSportSettings.paceZones || []
        }
      : null

  return {
    ftp: Number.isFinite(ftp) && ftp > 0 ? ftp : 250,
    generationSettingsSnapshot: snapshot,
    sportSettings
  }
}

export function buildExportOptionsFromPlannedWorkout(
  workout: PlannedWorkoutExportSource & {
    title: string
    description?: string | null
    type?: string | null
    durationSec?: number | null
    distanceMeters?: number | null
  },
  liveSportSettings?: any | null
) {
  const zoneProfileSnapshot =
    (workout.structuredWorkout as any)?.zoneProfileSnapshot ||
    (liveSportSettings ? createZoneProfileSnapshot(liveSportSettings) : undefined)

  return {
    workout,
    liveSportSettings,
    zoneProfileSnapshot,
    title: workout.title,
    description: workout.description || '',
    type: workout.type,
    durationSec: workout.durationSec,
    distanceMeters: workout.distanceMeters
  }
}
