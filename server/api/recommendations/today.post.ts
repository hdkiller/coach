import { getServerSession } from '../../utils/session'
import { getUserTimezone, getUserLocalDate } from '../../utils/date'
import { tasks } from '@trigger.dev/sdk/v3'
import { prisma } from '../../utils/db'
import { activityRecommendationRepository } from '../../utils/repositories/activityRecommendationRepository'
import { checkQuota } from '../../utils/quotas/engine'
import { publishTaskRunStartedEvent } from '../../utils/task-run-events'

defineRouteMeta({
  openAPI: {
    tags: ['Recommendations'],
    summary: 'Generate recommendation',
    description: 'Triggers AI generation of a daily activity recommendation.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                jobId: { type: 'string' },
                recommendationId: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  try {
    const session = await getServerSession(event)

    if (!session?.user) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized'
      })
    }

    const userId = (session.user as any).id

    // 0. Quota Check
    try {
      await checkQuota(userId, 'activity_recommendation')
    } catch (error: any) {
      if (error.statusCode === 429) {
        throw createError({
          statusCode: 429,
          message: error.message || 'Quota exceeded for activity recommendation.'
        })
      }
      throw error
    }

    const timezone = await getUserTimezone(userId)
    const today = getUserLocalDate(timezone)

    const body = await readBody(event)
    const userFeedback = body?.userFeedback

    // Create a PENDING recommendation record immediately
    const recommendation = await activityRecommendationRepository.createProcessingPlaceholder(
      userId,
      today
    )

    // Trigger background job with the recommendation ID
    const handle = await tasks.trigger(
      'recommend-today-activity',
      {
        userId,
        date: today,
        recommendationId: recommendation.id,
        userFeedback
      },
      {
        concurrencyKey: userId,
        tags: [`user:${userId}`]
      }
    )

    await publishTaskRunStartedEvent(userId, 'recommend-today-activity', handle)

    return {
      success: true,
      jobId: handle.id,
      recommendationId: recommendation.id,
      message: "Generating today's recommendation"
    }
  } catch (error: any) {
    console.error('Error in /api/recommendations/today:', error)

    if (error?.name === 'PrismaClientValidationError') {
      throw createError({
        statusCode: 500,
        message: 'Failed to create recommendation record. Please try again.'
      })
    }

    throw error
  }
})
