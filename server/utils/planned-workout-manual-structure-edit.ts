import { prisma } from './db'
import { sportSettingsRepository } from './repositories/sportSettingsRepository'
import { syncPlannedWorkoutToIntervals } from './intervals-sync'
import { serializeCanonicalForIntervals } from './canonical-workout-serializer'
import { buildStructurePublishFields } from './planned-workout-structure-sync'
import { hasActiveStructureGenerationRun } from './structure-generation-run'
import {
  createZoneProfileSnapshot,
  type ZoneProfileSnapshot
} from '../../shared/structured-workout-contract'
import {
  assessWorkoutSettingsStaleness,
  type SettingsStaleness
} from '../../shared/workout-settings-staleness'

export type ManualStructureSyncStatus = 'LOCAL_ONLY' | 'SYNCED' | 'PENDING'

export type PlannedWorkoutOperationalContext = {
  sync_conflict: boolean
  has_pending_remote_structure: boolean
  structure_generation_in_flight: boolean
  settings_staleness: SettingsStaleness
  has_unresolved_targets: boolean
  structure_source: string | null
  unresolved_diagnostics_count: number
}

export function resolveManualEditZoneProfileSnapshot(options: {
  existingStructuredWorkout?: unknown
  sportSettings: any
  rebaseZones?: boolean
}) {
  if (options.rebaseZones) {
    return createZoneProfileSnapshot(options.sportSettings)
  }

  return (
    (options.existingStructuredWorkout as any)?.zoneProfileSnapshot ||
    createZoneProfileSnapshot(options.sportSettings)
  )
}

export async function buildPlannedWorkoutOperationalContext(
  userId: string,
  workout: {
    id: string
    type?: string | null
    syncConflict?: boolean | null
    pendingRemoteStructuredWorkout?: unknown
    lastGenerationSettingsSnapshot?: unknown
    createdFromSettingsSnapshot?: unknown
    structuredWorkout?: unknown
    user?: { ftp?: number | null } | null
  }
): Promise<PlannedWorkoutOperationalContext> {
  const sportSettings = await sportSettingsRepository.getForActivityType(userId, workout.type || '')
  const settingsStaleness = assessWorkoutSettingsStaleness({
    workoutType: workout.type,
    lastGenerationSettingsSnapshot: workout.lastGenerationSettingsSnapshot,
    createdFromSettingsSnapshot: workout.createdFromSettingsSnapshot,
    liveSportSettings: sportSettings,
    liveUserFtp: workout.user?.ftp
  })
  const structured = workout.structuredWorkout as any
  const diagnostics = Array.isArray(structured?.diagnostics) ? structured.diagnostics : []

  return {
    sync_conflict: Boolean(workout.syncConflict),
    has_pending_remote_structure: Boolean(workout.pendingRemoteStructuredWorkout),
    structure_generation_in_flight: await hasActiveStructureGenerationRun(workout.id),
    settings_staleness: settingsStaleness,
    has_unresolved_targets: diagnostics.length > 0,
    structure_source: typeof structured?.source === 'string' ? structured.source : null,
    unresolved_diagnostics_count: diagnostics.length
  }
}

export async function syncManualPlannedWorkoutStructureToIntervalsIfSynced(options: {
  userId: string
  plannedWorkoutId: string
  priorSyncStatus: string | null | undefined
  updatedWorkout: {
    title: string
    description?: string | null
    type?: string | null
    structuredWorkout?: unknown
    lastGenerationSettingsSnapshot?: unknown
    createdFromSettingsSnapshot?: unknown
    [key: string]: unknown
  }
  canonical: {
    zoneProfileSnapshot?: unknown
    [key: string]: unknown
  }
  sportSettings: any
  liveUserFtp?: number | null
}): Promise<{ synced: boolean; sync_status: ManualStructureSyncStatus }> {
  if (options.priorSyncStatus === 'LOCAL_ONLY') {
    return { synced: false, sync_status: 'LOCAL_ONLY' }
  }

  if (options.priorSyncStatus !== 'SYNCED') {
    return { synced: false, sync_status: 'PENDING' }
  }

  const syncText = serializeCanonicalForIntervals({
    title: options.updatedWorkout.title,
    description: options.updatedWorkout.description || '',
    type: options.updatedWorkout.type,
    structure: options.canonical,
    zoneProfileSnapshot: options.canonical.zoneProfileSnapshot as ZoneProfileSnapshot | undefined,
    workout: options.updatedWorkout,
    liveSportSettings: options.sportSettings,
    liveUserFtp: options.liveUserFtp
  })

  const syncResult = await syncPlannedWorkoutToIntervals(
    'UPDATE',
    {
      ...options.updatedWorkout,
      workout_doc: syncText
    },
    options.userId
  )

  if (syncResult.synced) {
    await prisma.plannedWorkout.update({
      where: { id: options.plannedWorkoutId },
      data: {
        ...buildStructurePublishFields(options.updatedWorkout.structuredWorkout),
        syncStatus: 'SYNCED',
        lastSyncedAt: new Date(),
        syncError: null
      }
    })
    return { synced: true, sync_status: 'SYNCED' }
  }

  return { synced: false, sync_status: 'PENDING' }
}

export function buildManualStructureEditStatusMessage(options: {
  sync_status: ManualStructureSyncStatus
  intervals_synced: boolean
  zone_profile_rebased?: boolean
}) {
  if (options.zone_profile_rebased) {
    return 'Planned workout structure updated with current sport settings zones.'
  }

  if (options.intervals_synced) {
    return 'Planned workout structure updated and pushed to Intervals.icu.'
  }

  if (options.sync_status === 'LOCAL_ONLY') {
    return 'Planned workout structure updated locally. Publish to Intervals.icu when you are ready.'
  }

  if (options.sync_status === 'PENDING') {
    return 'Planned workout structure updated locally. Intervals.icu sync is pending — publish when ready.'
  }

  return 'Planned workout structure updated.'
}
