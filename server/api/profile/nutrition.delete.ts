import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'

defineRouteMeta({
  openAPI: {
    tags: ['Profile'],
    summary: 'Wipe Nutrition Logs',
    description: 'Removes all imported calorie, macro, and hydration data.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                counts: {
                  type: 'object',
                  properties: {
                    nutrition: { type: 'integer' },
                    recommendations: { type: 'integer' },
                    plans: { type: 'integer' }
                  }
                }
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

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const userId = (session.user as any).id

  // 1. Delete Nutrition Plans (Cascade to meals)
  const plansDelete = await prisma.nutritionPlan.deleteMany({
    where: { userId }
  })

  // 2. Delete Nutrition Recommendations
  const recommendationsDelete = await prisma.nutritionRecommendation.deleteMany({
    where: { userId }
  })

  // 3. Delete Nutrition records
  const nutritionDelete = await prisma.nutrition.deleteMany({
    where: { userId }
  })

  return {
    success: true,
    counts: {
      nutrition: nutritionDelete.count,
      recommendations: recommendationsDelete.count,
      plans: plansDelete.count
    }
  }
})
