import { requireAuth } from '../../../utils/auth-guard'
import { nutritionDatabaseService } from '../../../utils/services/nutritionDatabaseService'

defineRouteMeta({
  openAPI: {
    tags: ['Nutrition'],
    summary: 'Lookup food item by barcode',
    description:
      'Lookup food item details using UPC/EAN barcode from the nutrition feeder service.',
    security: [{ bearerAuth: [] }]
  }
})

export default defineEventHandler(async (event) => {
  await requireAuth(event, ['nutrition:read'])

  const barcode = getRouterParam(event, 'barcode')

  if (!barcode) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Barcode route parameter is required'
    })
  }

  const item = await nutritionDatabaseService.lookupFoodBarcode(barcode)

  if (!item) {
    throw createError({
      statusCode: 404,
      statusMessage: `Food item with barcode "${barcode}" not found`
    })
  }

  return {
    success: true,
    item
  }
})
