import { requireAuth } from '../../../utils/auth-guard'
import { nutritionDatabaseService } from '../../../utils/services/nutritionDatabaseService'

defineRouteMeta({
  openAPI: {
    tags: ['Nutrition'],
    summary: 'Get food item by external key',
    description: 'Fetch food item details by external_key from the nutrition feeder service.',
    security: [{ bearerAuth: [] }]
  }
})

export default defineEventHandler(async (event) => {
  await requireAuth(event, ['nutrition:read'])

  const rawKey = getRouterParam(event, 'key')

  if (!rawKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Key parameter is required'
    })
  }

  const key = Array.isArray(rawKey) ? rawKey.join('/') : rawKey
  const item = await nutritionDatabaseService.getFoodItemByKey(key)

  if (!item) {
    throw createError({
      statusCode: 404,
      statusMessage: `Food item with key "${key}" not found`
    })
  }

  return {
    success: true,
    item
  }
})
