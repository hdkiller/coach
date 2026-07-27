import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { nutritionPlanService } from '../../../utils/services/nutritionPlanService'

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event, ['nutrition:write'])

  const userId = authUser.id
  const body = await readBody(event)

  if (!body.date || !body.windowType || !body.meal) {
    throw createError({ statusCode: 400, message: 'Date, windowType, and meal are required' })
  }
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
        windowAssignments: Array.isArray(body.windowAssignments)
          ? body.windowAssignments
          : undefined
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
