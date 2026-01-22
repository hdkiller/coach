import { getServerSession } from '../../utils/session'
import { plannedWorkoutRepository } from '../../utils/repositories/plannedWorkoutRepository'

defineRouteMeta({
  openAPI: {
    tags: ['Planned Workouts'],
    summary: 'Get planned workout',
    description: 'Returns details for a specific planned workout.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                date: { type: 'string', format: 'date-time' },
                type: { type: 'string' },
                description: { type: 'string', nullable: true },
                durationSec: { type: 'integer', nullable: true },
                tss: { type: 'number', nullable: true }
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

  if (!workoutId) {
    throw createError({
      statusCode: 400,
      message: 'Workout ID is required'
    })
  }

  try {
    const workout = await plannedWorkoutRepository.getById(workoutId, userId)

    if (!workout) {
      throw createError({
        statusCode: 404,
        message: 'Workout not found'
      })
    }

    return workout
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('Error fetching planned workout:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch planned workout'
    })
  }
})
