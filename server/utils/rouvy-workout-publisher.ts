import { WorkoutConverter } from './workout-converter'
import { prisma } from './db'
import { buildZonedDateTimeFromUtcDate } from './date'
import { pushRouvyWorkout } from './rouvy'
import { plannedWorkoutPublishRepository } from './repositories/plannedWorkoutPublishRepository'
import { buildStructurePublishFields } from './planned-workout-structure-sync'

function buildRouvyFilename(title: string) {
  const basename = title
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)

  return `${basename || 'workout'}.zwo`
}

export async function publishPlannedWorkoutToRouvy(workoutId: string, userId: string) {
  const workout = await prisma.plannedWorkout.findFirst({
    where: { id: workoutId, userId },
    include: {
      user: { select: { ftp: true, name: true, timezone: true } }
    }
  })

  if (!workout) {
    throw createError({ statusCode: 404, message: 'Workout not found' })
  }

  if (!workout.structuredWorkout) {
    throw createError({ statusCode: 400, message: 'Workout has no structured workout to publish' })
  }

  const integration = await prisma.integration.findFirst({
    where: { userId, provider: 'rouvy' }
  })

  if (!integration) {
    throw createError({ statusCode: 400, message: 'ROUVY integration not found' })
  }

  const structuredWorkout = workout.structuredWorkout as any
  const zwoContent = WorkoutConverter.toZWO({
    title: workout.title,
    description: workout.description || '',
    author: workout.user.name || 'Coach Wattz',
    type: workout.type || 'Ride',
    steps: structuredWorkout.steps || [],
    messages: structuredWorkout.messages || [],
    ftp: workout.user.ftp || 250
  })
  const plannedAt = buildZonedDateTimeFromUtcDate(
    workout.date,
    workout.startTime,
    workout.user.timezone || 'UTC'
  ).toISOString()

  try {
    const result = await pushRouvyWorkout(
      integration,
      plannedAt,
      zwoContent,
      buildRouvyFilename(workout.title)
    )
    const syncedAt = new Date()
    const externalId =
      result && typeof result === 'object' && result.workoutId != null
        ? String(result.workoutId)
        : null

    await prisma.plannedWorkout.update({
      where: { id: workout.id },
      data: {
        syncStatus: 'SYNCED',
        syncError: null,
        lastSyncedAt: syncedAt,
        ...buildStructurePublishFields(workout.structuredWorkout, syncedAt)
      }
    })
    await plannedWorkoutPublishRepository.upsert(workout.id, 'rouvy', {
      externalId,
      status: 'SYNCED',
      error: null,
      lastSyncedAt: syncedAt
    })

    return {
      success: true,
      message: 'Workout published to ROUVY.',
      result,
      plannedAt
    }
  } catch (error: any) {
    await prisma.plannedWorkout.update({
      where: { id: workout.id },
      data: {
        syncStatus: 'FAILED',
        syncError: error.message || 'Failed to publish workout to ROUVY'
      }
    })
    await plannedWorkoutPublishRepository.upsert(workout.id, 'rouvy', {
      status: 'FAILED',
      error: error.message || 'Failed to publish workout to ROUVY'
    })

    throw error
  }
}
