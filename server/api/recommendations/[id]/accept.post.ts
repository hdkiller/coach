import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { tasks } from '@trigger.dev/sdk/v3'
import {
  syncPlannedWorkoutToIntervals,
  autoUploadPlannedWorkoutToIntervalsIfEnabled
} from '../../../utils/intervals-sync'
import { isIntervalsEventId } from '../../../utils/intervals'

defineRouteMeta({
  openAPI: {
    tags: ['Recommendations'],
    summary: 'Accept recommendation',
    description: 'Accepts the suggested modifications and updates the planned workout.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' },
      404: { description: 'Recommendation not found' },
      400: { description: 'Invalid recommendation state' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing recommendation ID' })
  }

  // Fetch the recommendation with the user check
  const recommendation = await prisma.activityRecommendation.findUnique({
    where: { id },
    include: { plannedWorkout: { include: { completedWorkouts: true } } }
  })

  if (!recommendation || recommendation.userId !== userId) {
    throw createError({ statusCode: 404, message: 'Recommendation not found' })
  }

  if (recommendation.userAccepted) {
    throw createError({ statusCode: 400, message: 'Recommendation already accepted' })
  }

  const analysis = recommendation.analysisJson as any
  const modifications = analysis?.suggested_modifications

  if (!modifications) {
    throw createError({ statusCode: 400, message: 'No suggested modifications found' })
  }

  // Prepare the new description (completely replacing the old one)
  const newDescription = `${modifications.description}${modifications.zone_adjustments ? `\n\nZone Adjustments: ${modifications.zone_adjustments}` : ''}`
  const type =
    modifications.new_type === 'Gym' ? 'WeightTraining' : modifications.new_type || 'Ride'
  const title =
    modifications.new_title?.trim() ||
    (type === 'Rest' ? 'Rest Day' : recommendation.plannedWorkout?.title || 'Updated Workout')

  let targetPlannedWorkoutId = recommendation.plannedWorkoutId

  // Check if the linked planned workout is already completed
  if (
    recommendation.plannedWorkout &&
    (recommendation.plannedWorkout.completed ||
      recommendation.plannedWorkout.completionStatus === 'COMPLETED' ||
      recommendation.plannedWorkout.completedWorkouts.length > 0)
  ) {
    // If the workout is already completed, we treat this as a new recommendation request
    // and create a NEW workout instead of updating the completed one.
    // This prevents the "517% compliance" bug where a completed workout's targets are retroactively changed.
    targetPlannedWorkoutId = null
  }

  let updatedWorkout
  const nextSyncStatus = (syncStatus: string | null | undefined) =>
    syncStatus === 'LOCAL_ONLY' ? 'LOCAL_ONLY' : 'PENDING'

  if (targetPlannedWorkoutId) {
    // UPDATE existing workout
    updatedWorkout = await prisma.plannedWorkout.update({
      where: { id: targetPlannedWorkoutId },
      data: {
        title,
        type,
        durationSec: modifications.new_duration_min
          ? Math.round(modifications.new_duration_min * 60)
          : undefined,
        tss: modifications.new_tss,
        description: newDescription,
        modifiedLocally: true,
        syncStatus: nextSyncStatus(recommendation.plannedWorkout?.syncStatus),
        syncError: null
      }
    })
  } else {
    // CREATE new workout
    updatedWorkout = await prisma.plannedWorkout.create({
      data: {
        userId,
        date: recommendation.date,
        title,
        type,
        durationSec: modifications.new_duration_min
          ? Math.round(modifications.new_duration_min * 60)
          : 0,
        tss: modifications.new_tss || 0,
        description: newDescription,
        category: modifications.new_type === 'Rest' ? 'WORKOUT' : 'WORKOUT', // As per Issue #89
        syncStatus: 'LOCAL_ONLY',
        externalId: `ai_gen_${userId}_${recommendation.date.toISOString().split('T')[0]}_${Date.now()}`,
        managedBy: 'COACH_WATTS',
        modifiedLocally: true,
        syncError: null
      }
    })
    targetPlannedWorkoutId = updatedWorkout.id

    // Link it to the recommendation
    await prisma.activityRecommendation.update({
      where: { id },
      data: { plannedWorkoutId: targetPlannedWorkoutId }
    })
  }

  const requiresStructure = updatedWorkout.type !== 'Rest'

  // For newly created local workouts, publish the shell first when auto-upload is enabled
  // so the background structure generation can sync the final intervals back to the same event.
  const isLocal =
    updatedWorkout.syncStatus === 'LOCAL_ONLY' || !isIntervalsEventId(updatedWorkout.externalId)
  if (requiresStructure && isLocal) {
    await autoUploadPlannedWorkoutToIntervalsIfEnabled({
      id: updatedWorkout.id,
      userId,
      externalId: updatedWorkout.externalId,
      date: updatedWorkout.date,
      startTime: updatedWorkout.startTime,
      title: updatedWorkout.title,
      description: updatedWorkout.description,
      type: updatedWorkout.type,
      durationSec: updatedWorkout.durationSec,
      tss: updatedWorkout.tss,
      managedBy: updatedWorkout.managedBy
    })

    updatedWorkout =
      (await prisma.plannedWorkout.findUnique({
        where: { id: updatedWorkout.id }
      })) || updatedWorkout
  }

  // Trigger regeneration of structured workout based on the new description/title/params.
  // The generation task is responsible for syncing the final structure to Intervals.
  if (requiresStructure) {
    await tasks.trigger(
      'generate-structured-workout',
      {
        plannedWorkoutId: targetPlannedWorkoutId
      },
      {
        concurrencyKey: userId,
        tags: [`user:${userId}`]
      }
    )
  } else if (!isLocal) {
    // Rest-day or metadata-only updates can sync immediately because no structured steps are pending.
    await syncPlannedWorkoutToIntervals(
      'UPDATE',
      {
        id: updatedWorkout.id,
        externalId: updatedWorkout.externalId,
        date: updatedWorkout.date,
        title: updatedWorkout.title,
        description: updatedWorkout.description,
        type: updatedWorkout.type,
        durationSec: updatedWorkout.durationSec,
        tss: updatedWorkout.tss,
        managedBy: updatedWorkout.managedBy
      },
      userId
    )
  }

  // Mark recommendation as accepted
  await prisma.activityRecommendation.update({
    where: { id },
    data: {
      userAccepted: true
    }
  })

  return {
    success: true,
    message: 'Workout updated successfully'
  }
})
