import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import { computeStructuredWorkoutHash } from '../../../../utils/planned-workout-structure-sync'
import { enqueuePlannedWorkoutStructureGeneration } from '../../../../utils/planned-workout-structure-trigger'
import { sportSettingsRepository } from '../../../../utils/repositories/sportSettingsRepository'
import { resolveWorkoutTargeting } from '../../../../../trigger/utils/workout-targeting'
import { writeCanonicalPlannedWorkoutStructure } from '../../../../utils/canonical-planned-workout-write'
import { adaptStructuredWorkout } from '../../../../../shared/structured-workout-contract'

type Resolution = 'keep_local' | 'accept_remote' | 'regenerate'

/** Resolves a persisted Intervals/local structure conflict without discarding audit data. */
export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Workout ID is required' })
  const body = await readBody<{ resolution?: Resolution }>(event)
  const resolution = body?.resolution
  if (!['keep_local', 'accept_remote', 'regenerate'].includes(resolution || '')) {
    throw createError({ statusCode: 400, message: 'Invalid conflict resolution' })
  }

  const workout = await prisma.plannedWorkout.findFirst({ where: { id, userId: session.user.id } })
  if (!workout) throw createError({ statusCode: 404, message: 'Workout not found' })
  if (!workout.syncConflict && resolution !== 'regenerate') {
    throw createError({ statusCode: 409, message: 'Workout has no pending remote conflict' })
  }

  if (resolution === 'regenerate') {
    const queued = await enqueuePlannedWorkoutStructureGeneration({
      userId: session.user.id,
      plannedWorkoutId: id,
      source: 'api'
    })
    return { success: queued.status === 'queued', resolution, generation: queued, workout }
  }

  if (resolution === 'keep_local') {
    const updated = await prisma.plannedWorkout.update({
      where: { id },
      data: {
        syncConflict: false,
        pendingRemoteStructuredWorkout: Prisma.DbNull,
        modifiedLocally: true,
        syncStatus: 'PENDING',
        structureRevision: { increment: 1 }
      }
    })
    return { success: true, resolution, workout: updated }
  }

  const remote = adaptStructuredWorkout(workout.pendingRemoteStructuredWorkout, {
    source: 'INTERVALS_IMPORT',
    zoneProfileSnapshot: (workout.pendingRemoteStructuredWorkout as any)?.zoneProfileSnapshot
  })
  if (!remote)
    throw createError({ statusCode: 409, message: 'Pending remote structure is invalid' })

  const sportSettings = await sportSettingsRepository.getForActivityType(
    session.user.id,
    workout.type || ''
  )
  const { targetPolicy } = resolveWorkoutTargeting(sportSettings)
  const refs = {
    ftp: Number(sportSettings?.ftp || 250),
    lthr: Number(sportSettings?.lthr || 0),
    maxHr: Number(sportSettings?.maxHr || 0),
    thresholdPace: Number(sportSettings?.thresholdPace || 0)
  }

  const write = await writeCanonicalPlannedWorkoutStructure({
    plannedWorkoutId: id,
    source: 'INTERVALS_IMPORT',
    structure: remote,
    zoneProfileSnapshot: remote.zoneProfileSnapshot,
    syncStatus: 'SYNCED',
    refs,
    fallbackOrder: targetPolicy.fallbackOrder as Array<'power' | 'heartRate' | 'pace' | 'rpe'>,
    preservePlannedDuration: workout.durationSec,
    extra: {
      rawJson: {
        ...((workout.rawJson as any) || {}),
        acceptedRemoteStructureHash: computeStructuredWorkoutHash(remote),
        acceptedRemoteStructureAt: new Date().toISOString(),
        acceptedRemoteProvider: 'intervals'
      },
      lastRemoteStructureSeenAt: workout.lastRemoteStructureSeenAt || new Date(),
      remoteStructureHash: computeStructuredWorkoutHash(remote)
    }
  })

  return { success: true, resolution, workout: write.workout, stale: write.stale }
})
