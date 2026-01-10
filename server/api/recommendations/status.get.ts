import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { isTaskRunning } from '../../utils/trigger-check'

defineRouteMeta({
  openAPI: {
    tags: ['Recommendations'],
    summary: 'Get recommendation generation status',
    description: 'Checks if recommendation generation tasks are currently running.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                isRunning: { type: 'boolean' },
                task: { type: 'string', nullable: true } // 'analysis' or 'recommendation'
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
  const session = await getServerSession(event)

  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  // Check analysis task first (since it runs first in the chain)
  const isAnalysisRunning = await isTaskRunning('generate-score-explanations', user.id)
  if (isAnalysisRunning) {
    return {
      isRunning: true,
      task: 'analysis'
    }
  }

  // Check recommendation task
  const isRecommendationRunning = await isTaskRunning('generate-recommendations', user.id)
  if (isRecommendationRunning) {
    return {
      isRunning: true,
      task: 'recommendation'
    }
  }

  return {
    isRunning: false,
    task: null
  }
})
