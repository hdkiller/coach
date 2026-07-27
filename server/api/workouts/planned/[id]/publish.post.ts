import { z } from 'zod'
import { prisma } from '../../../../utils/db'
import { getServerSession } from '../../../../utils/session'
import {
  publishPlannedWorkoutToIntervals,
  throwPublishPlannedWorkoutHttpError
} from '../../../../utils/planned-workout-intervals-publish'
import { publishPlannedWorkoutToRouvy } from '../../../../utils/rouvy-workout-publisher'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing workout ID' })
  }

  const userId = (session.user as any).id
  const body = await readBody(event).catch(() => ({}))
  const provider = body?.provider === 'rouvy' ? 'rouvy' : 'intervals'

  if (provider === 'rouvy') {
    try {
      const result = await publishPlannedWorkoutToRouvy(id, userId)
      const updatedWorkout = await prisma.plannedWorkout.findUnique({ where: { id } })

      return {
        ...result,
        workout: updatedWorkout
      }
    } catch (error: any) {
      console.error('Error publishing workout to ROUVY:', error)
      throw createError({
        statusCode: error.statusCode || 500,
        message: error.message || 'Failed to sync workout with ROUVY'
      })
    }
  }

  const result = await publishPlannedWorkoutToIntervals(userId, id)
  if (!result.success) {
    throwPublishPlannedWorkoutHttpError(result)
  }

  return {
    success: true,
    message: result.message,
    action: result.action,
    warnings: result.warnings,
    workout: result.workout
  }
})
