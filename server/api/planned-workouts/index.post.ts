import { getServerSession } from '../../utils/session'
import { createPlannedWorkoutForUser } from '../../utils/planned-workout-service'

defineRouteMeta({
  openAPI: {
    tags: ['Planned Workouts'],
    summary: 'Create planned workout',
    description: 'Creates a new planned workout and syncs it to Intervals.icu.',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['date', 'title'],
            properties: {
              date: { type: 'string', format: 'date-time' },
              title: { type: 'string' },
              description: { type: 'string' },
              type: { type: 'string', default: 'Ride' },
              category: { type: 'string' },
              durationSec: { type: 'integer' },
              tss: { type: 'number' },
              workIntensity: { type: 'number' },
              structuredWorkout: { type: 'object' },
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
                workout: { type: 'object' }
              }
            }
          }
        }
      },
      400: { description: 'Invalid input' },
      401: { description: 'Unauthorized' }
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
  const body = await readBody(event)

  try {
    return await createPlannedWorkoutForUser(userId, body)
  } catch (error: any) {
    console.error('Error creating planned workout:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create planned workout'
    })
  }
})
