import { z } from 'zod/v3'
import { requireAuth } from '../../utils/auth-guard'
import { parseCalendarDate } from '../../utils/date'
import {
  CONCURRENT_UPDATE_CONFLICT,
  nutritionRepository
} from '../../utils/repositories/nutritionRepository'
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

  const nutrition = await nutritionRepository.getByDate(userId, date)

  let updatedNutrition: Awaited<ReturnType<typeof nutritionRepository.create>>

  if (!nutrition) {
    const snacks = [hydrationItem]
    const totals = recalculateNutritionTotals({ snacks })
    try {
      updatedNutrition = await nutritionRepository.create({
        userId,
        date,
        waterMl: totals.waterMl,
        snacks
      })
    } catch (err: any) {
      // Another request created the row for this date between our read and
      // this create (unique userId+date constraint violation).
      if (err?.code === 'P2002') {
        throw createError({
          statusCode: 409,
          message: 'A hydration entry was added elsewhere for this date. Please retry.'
        })
      }
      throw err
    }
  } else {
    // Merge the new snack entry and the recalculated waterMl total into a
    // single, version-checked write so a concurrent quick-add can never be
    // silently dropped by a lost-update race.
    const expectedUpdatedAt = nutrition.updatedAt
    const currentSnacks = Array.isArray(nutrition.snacks) ? nutrition.snacks : []
    const snacks = [...currentSnacks, hydrationItem]
    const totals = recalculateNutritionTotals({ ...nutrition, snacks })

    const result = await nutritionRepository.updateWithVersionCheck(
      nutrition.id,
      expectedUpdatedAt,
      {
        snacks,
        waterMl: totals.waterMl
      }
    )

    if (result === CONCURRENT_UPDATE_CONFLICT) {
      throw createError({
        statusCode: 409,
        message: 'This nutrition entry was updated elsewhere. Please retry.'
      })
    }

    updatedNutrition = result
  }

  return {
    success: true,
    date: body.date,
    addedMl: body.volumeMl,
    totalWaterMl: updatedNutrition.waterMl || 0,
    nutritionId: updatedNutrition.id
  }
})
