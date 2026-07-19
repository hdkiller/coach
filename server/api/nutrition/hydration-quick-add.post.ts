import { z } from 'zod/v3'
import { requireAuth } from '../../utils/auth-guard'
import { parseCalendarDate } from '../../utils/date'
import { nutritionRepository } from '../../utils/repositories/nutritionRepository'
import { normalizeFluidFields, recalculateNutritionTotals } from '../../utils/nutrition/totals'

const quickAddSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  volumeMl: z.number().int().positive().max(5000)
})

defineRouteMeta({
  openAPI: {
    tags: ['Nutrition'],
    summary: 'Quick-add hydration',
    description:
      'Appends a water volume to today’s nutrition log. Supports session, API key, and OAuth Bearer with nutrition:write.',
    security: [{ bearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['date', 'volumeMl'],
            properties: {
              date: { type: 'string', format: 'date' },
              volumeMl: { type: 'integer', minimum: 1, maximum: 5000 }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Success' },
      400: { description: 'Invalid data' },
      401: { description: 'Unauthorized' },
      403: { description: 'Forbidden' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['nutrition:write'])
  const userId = user.id
  const body = quickAddSchema.parse(await readBody(event))
  const date = parseCalendarDate(body.date)
  const now = new Date()

  if (!date) {
    throw createError({
      statusCode: 400,
      message: `Invalid calendar date: ${body.date}`
    })
  }

  const source =
    event.context.authType === 'oauth' ? `oauth:${event.context.oauthAppId}` : 'dashboard'

  const hydrationItem = normalizeFluidFields({
    id: crypto.randomUUID(),
    name: 'Water',
    water_ml: body.volumeMl,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    entryType: 'HYDRATION',
    logged_at: now.toISOString(),
    source
  })

  let nutrition = await nutritionRepository.getByDate(userId, date)

  if (!nutrition) {
    nutrition = await nutritionRepository.create({
      userId,
      date,
      waterMl: body.volumeMl,
      snacks: [hydrationItem]
    })
  } else {
    const currentSnacks = Array.isArray(nutrition.snacks) ? nutrition.snacks : []
    nutrition = await nutritionRepository.update(nutrition.id, {
      snacks: [...currentSnacks, hydrationItem],
      waterMl: Math.max(0, Number(nutrition.waterMl || 0) + body.volumeMl)
    })
  }

  const totals = recalculateNutritionTotals(nutrition as Record<string, any>)
  const updatedNutrition = await nutritionRepository.update(nutrition.id, {
    waterMl: totals.waterMl
  })

  return {
    success: true,
    date: body.date,
    addedMl: body.volumeMl,
    totalWaterMl: updatedNutrition.waterMl || 0,
    nutritionId: updatedNutrition.id
  }
})
