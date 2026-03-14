import { requireAuth } from '../../utils/auth-guard'
import { nutritionRepository } from '../../utils/repositories/nutritionRepository'
import { prisma } from '../../utils/db'
import { applyCanonicalNutritionTargets } from '../../utils/nutrition/canonical-targets'

defineRouteMeta({
  openAPI: {
    tags: ['Nutrition'],
    summary: 'List nutrition data',
    description: 'Returns the recent nutrition logs for the authenticated user.',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', default: 30 }
      },
      {
        name: 'startDate',
        in: 'query',
        schema: { type: 'string', format: 'date' }
      },
      {
        name: 'endDate',
        in: 'query',
        schema: { type: 'string', format: 'date' }
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
                count: { type: 'integer' },
                nutrition: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      date: { type: 'string', format: 'date' },
                      calories: { type: 'integer', nullable: true },
                      protein: { type: 'number', nullable: true },
                      carbs: { type: 'number', nullable: true },
                      fat: { type: 'number', nullable: true }
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['nutrition:read'])
  const userId = user.id

  const query = getQuery(event)
  const limitRaw = Array.isArray(query.limit) ? query.limit[0] : query.limit
  const limit = limitRaw ? parseInt(limitRaw as string, 10) : 30
  const startDateRaw = Array.isArray(query.startDate) ? query.startDate[0] : query.startDate
  const endDateRaw = Array.isArray(query.endDate) ? query.endDate[0] : query.endDate

  const parseDateQuery = (value: unknown, field: 'startDate' | 'endDate') => {
    if (!value || typeof value !== 'string') return undefined
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      throw createError({
        statusCode: 400,
        message: `Invalid ${field}. Expected an ISO date string (YYYY-MM-DD).`
      })
    }
    return parsed
  }

  const startDate = parseDateQuery(startDateRaw, 'startDate')
  const endDate = parseDateQuery(endDateRaw, 'endDate')

  try {
    const nutrition = await nutritionRepository.getForUser(userId, {
      startDate,
      endDate,
      limit,
      orderBy: { date: 'desc' }
    })

    // Format dates to avoid timezone issues
    const formattedNutrition = nutrition.map((n) => ({
      ...applyCanonicalNutritionTargets(n),
      date: n.date.toISOString().split('T')[0] // YYYY-MM-DD format
    }))

    // Fetch LLM usage for these nutrition records
    const nutritionIds = nutrition.map((n) => n.id)
    const llmUsages = await prisma.llmUsage.findMany({
      where: {
        entityId: { in: nutritionIds },
        entityType: 'Nutrition'
      },
      select: {
        id: true,
        entityId: true,
        feedback: true,
        feedbackText: true
      }
    })

    // Create a map for faster lookup
    const usageMap = new Map(llmUsages.map((u) => [u.entityId, u]))

    // Attach usage data to nutrition records
    const finalNutrition = formattedNutrition.map((n) => {
      const usage = usageMap.get(n.id)
      return {
        ...n,
        llmUsageId: usage?.id,
        feedback: usage?.feedback,
        feedbackText: usage?.feedbackText
      }
    })

    return {
      success: true,
      count: finalNutrition.length,
      nutrition: finalNutrition
    }
  } catch (error) {
    console.error('Error fetching nutrition data:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch nutrition data'
    })
  }
})
