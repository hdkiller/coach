import { requireAuth } from '../../utils/auth-guard'
import { nutritionDatabaseService } from '../../utils/services/nutritionDatabaseService'

defineRouteMeta({
  openAPI: {
    tags: ['Nutrition'],
    summary: 'Search nutrition database',
    description: 'Search branded and generic food items from the nutrition feeder service.',
    security: [{ bearerAuth: [] }],
    inputSchema: [
      {
        name: 'q',
        in: 'query',
        required: true,
        schema: { type: 'string' }
      },
      {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', default: 10 }
      }
    ]
  }
})

export default defineEventHandler(async (event) => {
  await requireAuth(event, ['nutrition:read'])

  const query = getQuery(event)
  const q = Array.isArray(query.q) ? query.q[0] : query.q
  const limitRaw = Array.isArray(query.limit) ? query.limit[0] : query.limit

  if (!q || typeof q !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Query parameter "q" is required'
    })
  }

  const limit = limitRaw ? parseInt(limitRaw as string, 10) : 10
  const items = await nutritionDatabaseService.searchFoodDatabase(q, limit)

  return {
    success: true,
    count: items.length,
    items
  }
})
