import { getServerSession } from '../../../utils/session'
import { recommendNutritionMealTask } from '../../../../trigger/recommend-nutrition-meal'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  const body = await readBody(event)

  if (!body.date) {
    throw createError({ statusCode: 400, message: 'Date is required' })
  }

  const recommendation = await prisma.nutritionRecommendation.create({
    data: {
      userId,
      date: new Date(body.date),
      scope: 'MEAL',
      windowType: body.windowType,
      status: 'PROCESSING',
      contextJson: {}
    }
  })

  const handle = await recommendNutritionMealTask.trigger(
    {
      userId,
      date: body.date,
      windowType: body.windowType,
      forceLlm: body.forceLlm,
      targetCarbs: body.targetCarbs,
      targetProtein: body.targetProtein,
      targetKcal: body.targetKcal,
      recommendationId: recommendation.id,
      runId: null
    },
    {
      concurrencyKey: userId,
      tags: [`user:${userId}`]
    }
  )

  await prisma.nutritionRecommendation.update({
    where: { id: recommendation.id },
    data: { runId: handle.id }
  })

  return {
    success: true,
    runId: handle.id,
    recommendationId: recommendation.id
  }
})
