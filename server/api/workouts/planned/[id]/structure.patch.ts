import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import { WorkoutParser } from '../../../../utils/workout-parser'
import { syncPlannedWorkoutToIntervals } from '../../../../utils/intervals-sync'
import { sportSettingsRepository } from '../../../../utils/repositories/sportSettingsRepository'
import { resolveWorkoutTargeting } from '../../../../../trigger/utils/workout-targeting'
import {
  normalizeStructuredWorkoutForPersistence,
  computeStructuredWorkoutMetrics,
  getPendingSyncStatus
} from '../../../../utils/structured-workout-persistence'
import {
  buildStructureEditFields,
  buildStructurePublishFields
} from '../../../../utils/planned-workout-structure-sync'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  const userId = session.user.id

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Workout ID is required' })
  }

  const body = await readBody(event)
  const { text } = body

  if (typeof text !== 'string') {
    throw createError({ statusCode: 400, message: 'Structure text is required' })
  }

  // 1. Verify ownership
  const workout = await prisma.plannedWorkout.findUnique({
    where: { id },
    include: {
      user: {
        select: { ftp: true }
      }
    }
  })

  if (!workout) {
    throw createError({ statusCode: 404, message: 'Planned workout not found' })
  }

  if (workout.userId !== userId) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // 2. Parse text to JSON
  const steps = WorkoutParser.parseIntervalsICU(text)
  const structuredWorkout = {
    ...((workout.structuredWorkout as any) || {}),
    steps
  }
  const sportSettings = await sportSettingsRepository.getForActivityType(userId, workout.type || '')
  const { targetPolicy, targetFormatPolicy } = resolveWorkoutTargeting(sportSettings)
  const refs = {
    ftp: Number((workout.user as any)?.ftp || sportSettings?.ftp || 250),
    lthr: Number(sportSettings?.lthr || 0),
    maxHr: Number(sportSettings?.maxHr || 0),
    thresholdPace: Number(sportSettings?.thresholdPace || 0),
    hrZones: Array.isArray(sportSettings?.hrZones) ? sportSettings.hrZones : [],
    powerZones: Array.isArray(sportSettings?.powerZones) ? sportSettings.powerZones : [],
    paceZones: Array.isArray(sportSettings?.paceZones) ? sportSettings.paceZones : []
  }
  const normalized = normalizeStructuredWorkoutForPersistence(structuredWorkout, {
    refs,
    targetPolicy,
    targetFormatPolicy,
    workoutType: workout.type || ''
  })
  const metrics = computeStructuredWorkoutMetrics(normalized, {
    refs,
    fallbackOrder: targetPolicy.fallbackOrder as Array<'power' | 'heartRate' | 'pace' | 'rpe'>
  })

  // 3. Update DB
  const updatedWorkout = await prisma.plannedWorkout.update({
    where: { id },
    data: {
      durationSec: metrics.durationSec > 0 ? metrics.durationSec : workout.durationSec,
      tss: metrics.tss > 0 ? metrics.tss : workout.tss,
      workIntensity: metrics.workIntensity ?? workout.workIntensity,
      syncStatus: getPendingSyncStatus(workout.syncStatus),
      syncError: null,
      ...buildStructureEditFields(normalized, 'USER')
    }
  })

  // 4. If already synced to Intervals, push update
  if (workout.syncStatus === 'SYNCED') {
    // Convert structure back to text to ensure it's clean (or just send the raw text from user)
    // Sending the raw text from user is better as it preserves comments/formatting Intervals might like.
    const syncResult = await syncPlannedWorkoutToIntervals(
      'UPDATE',
      {
        ...updatedWorkout,
        workout_doc: text // Preserving user's text exactly for Intervals
      },
      userId
    )

    if (syncResult.synced) {
      await prisma.plannedWorkout.update({
        where: { id },
        data: {
          ...buildStructurePublishFields(updatedWorkout.structuredWorkout),
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          syncError: null
        }
      })
    }
  }

  return {
    success: true,
    workout: updatedWorkout
  }
})
