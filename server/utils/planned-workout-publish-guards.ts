import { prisma } from './db'
import { sportSettingsRepository } from './repositories/sportSettingsRepository'
import { hasActiveStructureGenerationRun } from './structure-generation-run'
import { hasRenderableStructure } from './structured-workout-persistence'
import {
  assessWorkoutSettingsStaleness,
  type SettingsStaleness
} from '../../shared/workout-settings-staleness'

export type PublishPreconditionCode =
  'not_found' | 'no_structure' | 'generation_in_flight' | 'sync_conflict'

export type PlannedWorkoutPublishContext = {
  workout: {
    id: string
    userId: string
    title: string
    description: string | null
    type: string | null
    date: Date
    startTime: string | null
    durationSec: number | null
    distanceMeters: number | null
    tss: number | null
    managedBy: string | null
    externalId: string | null
    syncStatus: string | null
    syncConflict: boolean
    structuredWorkout: unknown
    lastGenerationSettingsSnapshot: unknown
    createdFromSettingsSnapshot: unknown
    user: { ftp: number | null; timezone?: string | null } | null
  }
  sportSettings: any
  settingsStaleness: SettingsStaleness
}

export type PublishPreconditionFailure = {
  ok: false
  code: PublishPreconditionCode
  error: string
  settings_staleness?: SettingsStaleness
}

export type PublishPreconditionSuccess = {
  ok: true
  context: PlannedWorkoutPublishContext
}

const STALENESS_LABELS: Record<string, string> = {
  profile_changed: 'sport profile',
  ftp_changed: 'FTP',
  lthr_changed: 'LTHR',
  threshold_pace_changed: 'threshold pace',
  zones_changed: 'zone boundaries'
}

export function formatSettingsStalenessPublishWarning(staleness: SettingsStaleness): string {
  const changed = (staleness.reasons || [])
    .map((reason) => STALENESS_LABELS[reason] || reason)
    .join(', ')
  if (!changed) return ''
  return ` Warning: your current ${changed} differ from when this structure was generated. Published absolute targets may not match what charts show unless you regenerate.`
}

export function appendPublishStalenessWarning(
  message: string,
  settingsStaleness?: SettingsStaleness | null
) {
  if (!settingsStaleness?.stale) return message
  return `${message}${formatSettingsStalenessPublishWarning(settingsStaleness)}`
}

export async function loadPlannedWorkoutPublishContext(
  userId: string,
  workoutId: string
): Promise<PublishPreconditionSuccess | PublishPreconditionFailure> {
  const workout = await prisma.plannedWorkout.findUnique({
    where: { id: workoutId, userId },
    include: { user: { select: { ftp: true, timezone: true } } }
  })

  if (!workout) {
    return { ok: false, code: 'not_found', error: 'Planned workout not found' }
  }

  if (!hasRenderableStructure(workout.structuredWorkout)) {
    return {
      ok: false,
      code: 'no_structure',
      error:
        'Workout structure is not ready yet. Wait for structure generation to finish or build structure first.'
    }
  }

  if (await hasActiveStructureGenerationRun(workoutId)) {
    return {
      ok: false,
      code: 'generation_in_flight',
      error:
        'Structure generation is still running for this workout. Wait for it to finish before publishing.'
    }
  }

  if (workout.syncConflict) {
    return {
      ok: false,
      code: 'sync_conflict',
      error: 'This workout has a sync conflict. Resolve the conflict before publishing.'
    }
  }

  const sportSettings = await sportSettingsRepository.getForActivityType(userId, workout.type || '')
  const settingsStaleness = assessWorkoutSettingsStaleness({
    workoutType: workout.type,
    lastGenerationSettingsSnapshot: workout.lastGenerationSettingsSnapshot,
    createdFromSettingsSnapshot: workout.createdFromSettingsSnapshot,
    liveSportSettings: sportSettings,
    liveUserFtp: workout.user?.ftp
  })

  return {
    ok: true,
    context: {
      workout,
      sportSettings,
      settingsStaleness
    }
  }
}

export function buildPublishWarnings(settingsStaleness: SettingsStaleness) {
  return settingsStaleness.stale ? { settings_staleness: settingsStaleness } : undefined
}
