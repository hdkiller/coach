import { z } from 'zod'
import { requireAuth } from '../../../../utils/auth-guard'
import { nutritionPlanService } from '../../../../utils/services/nutritionPlanService'

const planMealActionSchema = z.object({
  action: z.enum(['complete', 'skip', 'unlock', 'replace']),
  meal: z.any().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['nutrition:write'])
  const mealId = getRouterParam(event, 'mealId')

  if (!mealId) {
    throw createError({ statusCode: 400, message: 'Meal ID is required' })
  }

  const body = await readBody(event)
  const parsed = planMealActionSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid plan meal action payload',
      data: parsed.error.issues
    })
  }

  try {
    const result = await nutritionPlanService.updatePlanMealStatus(
      user.id,
      mealId,
      parsed.data.action,
      {
        meal: parsed.data.meal
      }
    )

    return {
      success: true,
      result
    }
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: error?.message || 'Failed to update planned meal'
    })
  }
})
