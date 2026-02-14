import { defineEventHandler, readBody } from 'h3'
import { getEffectiveUserId } from '../../../utils/coaching'
import { nutritionPlanService } from '../../../utils/services/nutritionPlanService'

function parseDateOnlyUtcStart(value: string) {
  const dateOnly = value.slice(0, 10)
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw createError({ statusCode: 400, message: `Invalid startDate: ${value}` })
  }
  return parsed
}

function parseDateOnlyUtcEnd(value: string) {
  const dateOnly = value.slice(0, 10)
  const parsed = new Date(`${dateOnly}T23:59:59.999Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw createError({ statusCode: 400, message: `Invalid endDate: ${value}` })
  }
  return parsed
}

export default defineEventHandler(async (event) => {
  const userId = await getEffectiveUserId(event)
  const body = await readBody(event)

  const start = body.startDate
    ? parseDateOnlyUtcStart(body.startDate)
    : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z')
  const end = body.endDate
    ? parseDateOnlyUtcEnd(body.endDate)
    : new Date(
        new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) +
          'T23:59:59.999Z'
      )

  try {
    const plan = await nutritionPlanService.generateDraftPlan(userId, start, end)
    return plan
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to generate nutrition plan'
    })
  }
})
