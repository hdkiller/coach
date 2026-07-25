import { requireAuth } from '../../../utils/auth-guard'
import { prisma } from '../../../utils/db'

function sanitizeNutritionRecommendation(recommendation: {
  id: string
  date: Date
  scope: string
  windowType: string | null
  status: string
  resultJson: unknown
  runId: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: recommendation.id,
    date: recommendation.date,
    scope: recommendation.scope,
    windowType: recommendation.windowType,
    status: recommendation.status,
    resultJson: recommendation.resultJson,
    runId: recommendation.runId,
    createdAt: recommendation.createdAt,
    updatedAt: recommendation.updatedAt
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['nutrition:read'])
  const userId = user.id
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'Recommendation ID is required' })
  }

  const recommendation = await prisma.nutritionRecommendation.findUnique({
    where: { id }
  })

  if (!recommendation || recommendation.userId !== userId) {
    throw createError({ statusCode: 404, message: 'Recommendation not found' })
  }

  return {
    success: true,
    recommendation: sanitizeNutritionRecommendation(recommendation)
  }
})
