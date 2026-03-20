import { getServerSession } from '../../utils/session'
import { updatePlannedWorkoutForUser } from '../../utils/planned-workout-service'

defineRouteMeta({
  openAPI: {
    tags: ['Planned Workouts'],
    summary: 'Update planned workout',
    description: 'Updates a specific planned workout and syncs changes to Intervals.icu.',
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
              date: { type: 'string', format: 'date-time' },
              title: { type: 'string' },
              description: { type: 'string' },
              type: { type: 'string' },
              durationSec: { type: 'integer' },
              tss: { type: 'number' },
              fuelingStrategy: { type: 'string', enum: ['STANDARD', 'TRAIN_LOW', 'HIGH_CARB'] }
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
                workout: { type: 'object' },
                syncStatus: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      },
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
  const workoutId = event.context.params?.id
  const body = await readBody(event)

  if (!workoutId) {
    throw createError({
      statusCode: 400,
      message: 'Workout ID is required'
    })
  }

  try {
    return await updatePlannedWorkoutForUser(userId, workoutId, body)
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('Error updating planned workout:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to update planned workout'
    })
  }
})
