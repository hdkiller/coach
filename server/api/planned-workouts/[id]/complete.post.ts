import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { plannedWorkoutRepository } from '../../../utils/repositories/plannedWorkoutRepository'
import { workoutRepository } from '../../../utils/repositories/workoutRepository'
import { metabolicService } from '../../../utils/services/metabolicService'
import { isNutritionTrackingEnabled } from '../../../utils/nutrition/feature'

defineRouteMeta({
  openAPI: {
    tags: ['Planned Workouts'],
    summary: 'Complete planned workout',
    description:
      'Marks a planned workout as completed, optionally linking it to an actual workout. Bearer `workout:write`.',
    security: [{ bearerAuth: [] }],
    inputSchema: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              workoutId: { type: 'string', nullable: true }
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                plannedWorkout: { type: 'object' },
                workout: { type: 'object', nullable: true }
              }
            }
          }
        }
      },
      400: { description: 'Invalid input' },
      401: { description: 'Unauthorized' },
      404: { description: 'Workout not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['workout:write'])
  const userId = user.id
  const plannedWorkoutId = event.context.params?.id
  let body: Record<string, any>
  try {
    body = (await readBody(event)) || {}
  } catch {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body'
    })
  }

  if (!plannedWorkoutId) {
    throw createError({
      statusCode: 400,
      message: 'Planned workout ID is required'
    })
  }

  try {
    const plannedWorkout = await plannedWorkoutRepository.getById(plannedWorkoutId, userId)

    if (!plannedWorkout) {
      throw createError({
        statusCode: 404,
        message: 'Planned workout not found'
      })
    }

    let updatedWorkout = null

    if (body.workoutId) {
      const workout = await workoutRepository.getById(body.workoutId, userId)

      if (!workout) {
        throw createError({
          statusCode: 404,
          message: 'Workout not found'
        })
      }

      updatedWorkout = await workoutRepository.update(body.workoutId, {
        plannedWorkout: { connect: { id: plannedWorkoutId } }
      })
    }

    const updatedPlannedWorkout = await plannedWorkoutRepository.update(plannedWorkoutId, userId, {
      completed: true,
      completionStatus: 'COMPLETED'
    })

    try {
      if (await isNutritionTrackingEnabled(userId)) {
        const targetDate = new Date(updatedWorkout?.date || plannedWorkout.date)
        await metabolicService.calculateFuelingPlanForDate(userId, targetDate, {
          persist: true
        })
      }
    } catch (err) {
      console.error('[PlannedWorkoutComplete] Failed to trigger regeneration:', err)
    }

    return {
      success: true,
      plannedWorkout: updatedPlannedWorkout,
      workout: updatedWorkout
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('Error marking planned workout complete:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to mark planned workout complete'
    })
  }
})
