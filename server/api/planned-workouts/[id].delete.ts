import { requireAuth } from '../../utils/auth-guard'
import { deletePlannedWorkoutForUser } from '../../utils/planned-workout-service'

defineRouteMeta({
  openAPI: {
    tags: ['Planned Workouts'],
    summary: 'Delete planned workout',
    description: 'Deletes a specific planned workout and removes it from Intervals.icu.',
    inputSchema: [
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
                success: { type: 'boolean' },
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
  // Match PATCH: planned workout writes use workout:write (not plan:write).
  const authUser = await requireAuth(event, ['workout:write'])
  const userId = authUser.id
  const workoutId = event.context.params?.id

  if (!workoutId) {
    throw createError({
      statusCode: 400,
      message: 'Workout ID is required'
    })
  }

  try {
    return await deletePlannedWorkoutForUser(userId, workoutId)
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('Error deleting planned workout:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to delete planned workout'
    })
  }
})
