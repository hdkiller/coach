import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { nutritionPlanService } from '../../../utils/services/nutritionPlanService'

// mealJson flows untouched into grocery aggregation, dashboards, and reconciliation, so the
// shape is validated here while unknown extra fields still pass through.
const numberLike = z.union([z.number(), z.string()])

const ingredientSchema = z
  .object({
    item: z.string().optional(),
    name: z.string().optional(),
    quantity: numberLike.nullish(),
    unit: z.string().nullish(),
    category: z.string().nullish()
  })
  .passthrough()

const mealSchema = z
  .object({
    title: z.string().optional(),
    name: z.string().optional(),
    totals: z
      .object({
        carbs: numberLike.nullish(),
        protein: numberLike.nullish(),
        kcal: numberLike.nullish(),
        calories: numberLike.nullish(),
        fat: numberLike.nullish()
      })
      .passthrough()
      .optional(),
    ingredients: z.array(ingredientSchema).optional()
  })
  .passthrough()

const windowAssignmentSchema = z
  .object({
    windowType: z.string().min(1),
    windowKey: z.string().optional(),
    slotName: z.string().optional(),
    label: z.string().optional(),
    targetCarbs: z.number().optional(),
    targetProtein: z.number().optional(),
    targetKcal: z.number().optional()
  })
  .passthrough()

const lockMealSchema = z.object({
  date: z.string().min(8),
  windowType: z.string().min(1),
  meal: mealSchema,
  slotName: z.string().optional(),
  windowKey: z.string().optional(),
  windowAssignments: z.array(windowAssignmentSchema).optional()
})

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event, ['nutrition:write'])

  const userId = authUser.id
  const rawBody = await readBody(event)

  const parsed = lockMealSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid lock meal payload',
      data: parsed.error.issues
    })
  }
  const body = parsed.data

  console.log('[nutrition/plan/meal.post] request', {
    userId,
    date: body.date,
    windowType: body.windowType,
    slotName: body.slotName,
    windowAssignmentsCount: Array.isArray(body.windowAssignments)
      ? body.windowAssignments.length
      : 0
  })

  try {
    const result = await nutritionPlanService.lockMeal(
      userId,
      body.date,
      body.windowType,
      body.meal,
      body.slotName,
      {
        windowKey: body.windowKey,
        windowAssignments: body.windowAssignments
      }
    )
    console.log('[nutrition/plan/meal.post] locked', {
      id: result.id,
      planId: result.planId,
      date: result.date,
      windowType: result.windowType,
      status: result.status
    })

    return {
      success: true,
      planMeal: result
    }
  } catch (error: any) {
    console.error('[nutrition/plan/meal.post] failed', {
      userId,
      date: body.date,
      windowType: body.windowType,
      slotName: body.slotName,
      error: error?.message || error
    })
    throw createError({
      statusCode: 500,
      message: error?.message || 'Failed to lock meal to plan'
    })
  }
})
