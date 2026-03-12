import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Workouts'],
    summary: 'Unlink duplicate workout',
    description: 'Removes the duplicate relationship between workouts.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' }
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
  const workoutId = getRouterParam(event, 'id')

  if (!workoutId) {
    throw createError({
      statusCode: 400,
      message: 'Workout ID is required'
    })
  }

  const workout = await prisma.workout.findUnique({
    where: {
      id: workoutId,
      userId
    },
    select: {
      id: true,
      isDuplicate: true,
      duplicateOf: true,
      date: true
    }
  })

  if (!workout) {
    throw createError({
      statusCode: 404,
      message: 'Workout not found'
    })
  }

  if (!workout.isDuplicate && !workout.duplicateOf) {
    return { success: true }
  }

  try {
    await prisma.workout.update({
      where: { id: workoutId },
      data: {
        isDuplicate: false,
        duplicateOf: null
      }
    })

    await recalculateStressAfterDate(userId, workout.date)

    return { success: true }
  } catch (error) {
    console.error('Error unlinking duplicate workout:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to unlink duplicate workout'
    })
  }
})
