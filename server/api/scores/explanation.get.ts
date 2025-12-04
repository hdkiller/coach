import { getServerSession } from '#auth'
import { prisma } from '../../utils/db'
import { tasks } from '@trigger.dev/sdk/v3'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user?.email) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const query = getQuery(event)
  const { type, period, metric } = query as {
    type: string
    period: string
    metric: string
  }

  if (!type || !period || !metric) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameters: type, period, metric'
    })
  }

  const periodNum = parseInt(period)
  if (isNaN(periodNum)) {
    throw createError({
      statusCode: 400,
      message: 'Period must be a number'
    })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })
  
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  try {
    // Try to find existing valid explanation
    const explanation = await prisma.scoreTrendExplanation.findUnique({
      where: {
        userId_type_period_metric: {
          userId: user.id,
          type,
          period: periodNum,
          metric
        }
      }
    })

    // If explanation exists and hasn't expired, return it
    if (explanation && explanation.expiresAt > new Date()) {
      return {
        analysis: explanation.analysisData,
        score: explanation.score,
        period: explanation.period,
        cached: true,
        generatedAt: explanation.generatedAt,
        expiresAt: explanation.expiresAt
      }
    }

    // If no valid explanation exists, trigger generation job
    // and return a message indicating generation is needed
    await tasks.trigger(
      "generate-score-explanations",
      { userId: user.id }
    )

    return {
      analysis: null,
      cached: false,
      message: 'Explanation generation triggered. Please try again in a few moments.',
      generating: true
    }
  } catch (error) {
    console.error('Error fetching explanation:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch explanation'
    })
  }
})