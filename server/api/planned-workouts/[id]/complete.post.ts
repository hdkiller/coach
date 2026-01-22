import { getServerSession } from '../../../utils/session'
import { plannedWorkoutRepository } from '../../../utils/repositories/plannedWorkoutRepository'
import { workoutRepository } from '../../../utils/repositories/workoutRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Planned Workouts'],
    summary: 'Complete planned workout',
    description: 'Marks a planned workout as completed by linking it to an actual workout.',
    parameters: [
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
  const session = await getServerSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const userId = (session.user as any).id
  const plannedWorkoutId = event.context.params?.id
  const body = await readBody(event)

  if (!plannedWorkoutId) {
    throw createError({
      statusCode: 400,
      message: 'Planned workout ID is required'
    })
  }

  // workoutId is now optional

  try {
    // Check if planned workout exists and belongs to user
    const plannedWorkout = await plannedWorkoutRepository.getById(plannedWorkoutId, userId)

    if (!plannedWorkout) {
      throw createError({
        statusCode: 404,
        message: 'Planned workout not found'
      })
    }

    let updatedWorkout = null

    if (body.workoutId) {
      // Check if workout exists and belongs to user
      const workout = await workoutRepository.getById(body.workoutId, userId)

      if (!workout) {
        throw createError({
          statusCode: 404,
          message: 'Workout not found'
        })
      }

      // Update workout to link to planned workout
      updatedWorkout = await workoutRepository.update(body.workoutId, {
        plannedWorkout: { connect: { id: plannedWorkoutId } }
      })
    }

    // Update planned workout to mark as completed
    const updatedPlannedWorkout = await plannedWorkoutRepository.update(plannedWorkoutId, userId, {
      completed: true,
      completionStatus: 'COMPLETED'
    })

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
