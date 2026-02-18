import { getServerSession } from '../../../utils/session'
import { publishWorkoutSummaryToIntervals } from '../../../utils/services/workout-summary-publish'

defineRouteMeta({
  openAPI: {
    tags: ['Workouts'],
    summary: 'Publish AI workout summary to Intervals.icu',
    description:
      'Publishes the workout AI executive summary to the linked Intervals.icu activity description.',
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
                success: { type: 'boolean' },
                message: { type: 'string' }
              }
            }
          }
        }
      },
      400: { description: 'Workout is not eligible for Intervals publish' },
      401: { description: 'Unauthorized' },
      404: { description: 'Workout not found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const workoutId = getRouterParam(event, 'id')
  if (!workoutId) {
    throw createError({ statusCode: 400, message: 'Workout ID is required' })
  }

  const userId = (session.user as any).id
  const result = await publishWorkoutSummaryToIntervals(workoutId, userId)
  if (!result.published) {
    const isNotFound = result.reason === 'Workout not found'
    throw createError({
      statusCode: isNotFound ? 404 : 400,
      message: result.reason || 'Could not publish workout summary'
    })
  }

  return {
    success: true,
    message: 'AI workout summary published to Intervals.icu notes'
  }
})
