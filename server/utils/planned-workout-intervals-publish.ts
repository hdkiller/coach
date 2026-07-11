import { prisma } from './db'
import {
  createIntervalsPlannedWorkout,
  updateIntervalsPlannedWorkout,
  cleanIntervalsDescription,
  isIntervalsEventId,
  normalizeIntervalsSportType
} from './intervals'
import { plannedWorkoutPublishRepository } from './repositories/plannedWorkoutPublishRepository'
import { plannedWorkoutRepository } from './repositories/plannedWorkoutRepository'
import { buildStructurePublishFields } from './planned-workout-structure-sync'
import { buildExportOptionsFromPlannedWorkout } from './workout-export-settings'
import { serializeCanonicalForIntervals } from './canonical-workout-serializer'
import {
  appendPublishStalenessWarning,
  buildPublishWarnings,
  formatSettingsStalenessPublishWarning,
  loadPlannedWorkoutPublishContext
} from './planned-workout-publish-guards'
import type { SettingsStaleness } from '../../shared/workout-settings-staleness'

export type PublishPlannedWorkoutIntervalsCode =
  | 'not_found'
  | 'no_integration'
  | 'no_structure'
  | 'generation_in_flight'
  | 'sync_conflict'
  | 'export_blocked'
  | 'publish_failed'

export type PublishPlannedWorkoutToIntervalsSuccess = {
  success: true
  message: string
  action: 'created' | 'updated' | 'recreated'
  workout: any
  warnings?: {
    settings_staleness?: SettingsStaleness
  }
}

export type PublishPlannedWorkoutToIntervalsFailure = {
  success: false
  code: PublishPlannedWorkoutIntervalsCode
  error: string
  diagnostics?: unknown
  settings_staleness?: SettingsStaleness
}

export type PublishPlannedWorkoutToIntervalsResult =
  PublishPlannedWorkoutToIntervalsSuccess | PublishPlannedWorkoutToIntervalsFailure

function isIntervalsNotFoundError(error: any): boolean {
  const message = String(error?.message || '')
  return message.includes('404') || message.includes('Event not found')
}

function buildIntervalsPayload(
  workout: {
    date: Date
    startTime?: string | null
    title: string
    description?: string | null
    type?: string | null
    durationSec?: number | null
    tss?: number | null
    managedBy?: string | null
  },
  workoutDoc: string
) {
  const intervalsType = normalizeIntervalsSportType(workout.type)
  return {
    date: workout.date,
    startTime: workout.startTime,
    title: workout.title,
    description: cleanIntervalsDescription(workout.description || ''),
    type: intervalsType,
    durationSec: workout.durationSec || 3600,
    tss: workout.tss ?? undefined,
    workout_doc: workoutDoc,
    managedBy: workout.managedBy
  }
}

async function markIntervalsPublishSuccess(
  workoutId: string,
  userId: string,
  provider: string,
  externalId: string,
  structuredWorkout: unknown
) {
  const syncedAt = new Date()
  await plannedWorkoutRepository.update(workoutId, userId, {
    externalId,
    syncStatus: 'SYNCED',
    lastSyncedAt: syncedAt,
    ...buildStructurePublishFields(structuredWorkout, syncedAt)
  })
  await plannedWorkoutPublishRepository.upsert(workoutId, provider, {
    externalId,
    status: 'SYNCED',
    error: null,
    lastSyncedAt: syncedAt
  })
}

/** Shared Intervals.icu publish/update path for HTTP routes and chat tools. */
export async function publishPlannedWorkoutToIntervals(
  userId: string,
  workoutId: string
): Promise<PublishPlannedWorkoutToIntervalsResult> {
  const precondition = await loadPlannedWorkoutPublishContext(userId, workoutId)
  if (!precondition.ok) {
    return {
      success: false,
      code: precondition.code,
      error: precondition.error,
      ...(precondition.settings_staleness
        ? { settings_staleness: precondition.settings_staleness }
        : {})
    }
  }

  const { workout, sportSettings, settingsStaleness } = precondition.context

  const integration = await prisma.integration.findFirst({
    where: { userId, provider: 'intervals' }
  })
  if (!integration) {
    return {
      success: false,
      code: 'no_integration',
      error: 'Intervals.icu integration not found'
    }
  }

  const provider = 'intervals'
  const existingTarget = await plannedWorkoutPublishRepository.getByProvider(workoutId, provider)
  const existingExternalId =
    existingTarget?.externalId && isIntervalsEventId(existingTarget.externalId)
      ? existingTarget.externalId
      : isIntervalsEventId(workout.externalId)
        ? workout.externalId
        : null
  const isLocal = !existingExternalId

  let workoutDoc = ''
  try {
    if (workout.structuredWorkout) {
      const exportBase = buildExportOptionsFromPlannedWorkout(workout, sportSettings)
      workoutDoc = serializeCanonicalForIntervals({
        ...exportBase,
        structure: workout.structuredWorkout,
        liveSportSettings: sportSettings,
        liveUserFtp: workout.user?.ftp
      })
    }
  } catch (error: any) {
    return {
      success: false,
      code: 'export_blocked',
      error: error?.message || 'Workout cannot be exported to Intervals.icu.',
      diagnostics: error?.data?.issues || error?.data?.diagnostics,
      settings_staleness: settingsStaleness.stale ? settingsStaleness : undefined
    }
  }

  const payload = buildIntervalsPayload(workout, workoutDoc)

  try {
    let action: 'created' | 'updated' | 'recreated' = 'created'
    let message = 'Workout published to Intervals.icu.'

    if (isLocal) {
      const intervalsWorkout = await createIntervalsPlannedWorkout(integration, payload)
      await markIntervalsPublishSuccess(
        workoutId,
        userId,
        provider,
        String(intervalsWorkout.id),
        workout.structuredWorkout
      )
    } else {
      try {
        await updateIntervalsPlannedWorkout(integration, existingExternalId!, payload)
        action = 'updated'
        message = 'Workout updated on Intervals.icu.'
        await markIntervalsPublishSuccess(
          workoutId,
          userId,
          provider,
          existingExternalId!,
          workout.structuredWorkout
        )
      } catch (updateError: any) {
        if (!isIntervalsNotFoundError(updateError)) throw updateError

        const intervalsWorkout = await createIntervalsPlannedWorkout(integration, payload)
        action = 'recreated'
        message = 'Workout recreated on Intervals.icu.'
        await markIntervalsPublishSuccess(
          workoutId,
          userId,
          provider,
          String(intervalsWorkout.id),
          workout.structuredWorkout
        )
      }
    }

    message = appendPublishStalenessWarning(message, settingsStaleness)

    const updatedWorkout = await prisma.plannedWorkout.findUnique({ where: { id: workoutId } })
    const warnings = buildPublishWarnings(settingsStaleness)

    return {
      success: true,
      message,
      action,
      workout: updatedWorkout,
      ...(warnings ? { warnings } : {})
    }
  } catch (error: any) {
    await plannedWorkoutPublishRepository.upsert(workoutId, provider, {
      status: 'FAILED',
      error: error?.message || 'Failed to publish to Intervals.icu.'
    })
    return {
      success: false,
      code: 'publish_failed',
      error: error?.message || 'Failed to publish to Intervals.icu.',
      settings_staleness: settingsStaleness.stale ? settingsStaleness : undefined
    }
  }
}

export function throwPublishPlannedWorkoutHttpError(
  result: PublishPlannedWorkoutToIntervalsFailure
): never {
  const statusByCode: Record<PublishPlannedWorkoutIntervalsCode, number> = {
    not_found: 404,
    no_integration: 400,
    no_structure: 422,
    generation_in_flight: 409,
    sync_conflict: 409,
    export_blocked: 422,
    publish_failed: 500
  }

  throw createError({
    statusCode: statusByCode[result.code] || 500,
    message: result.error,
    data: {
      code: result.code,
      diagnostics: result.diagnostics,
      settings_staleness: result.settings_staleness
    }
  })
}

export function throwPublishPreconditionHttpError(
  code:
    | PublishPlannedWorkoutIntervalsCode
    | 'not_found'
    | 'no_structure'
    | 'generation_in_flight'
    | 'sync_conflict',
  error: string,
  data?: Partial<PublishPlannedWorkoutToIntervalsFailure>
): never {
  throwPublishPlannedWorkoutHttpError({
    success: false,
    code: code as PublishPlannedWorkoutIntervalsCode,
    error,
    ...data
  })
}
