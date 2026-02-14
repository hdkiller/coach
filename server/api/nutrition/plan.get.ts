import { defineEventHandler, getQuery } from 'h3'
import { getEffectiveUserId } from '../../utils/coaching'
import { nutritionPlanService } from '../../utils/services/nutritionPlanService'

function parseDateOnlyUtcStart(value: string) {
  const dateOnly = value.slice(0, 10)
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw createError({ statusCode: 400, message: `Invalid start date: ${value}` })
  }
  return parsed
}

function parseDateOnlyUtcEnd(value: string) {
  const dateOnly = value.slice(0, 10)
  const parsed = new Date(`${dateOnly}T23:59:59.999Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw createError({ statusCode: 400, message: `Invalid end date: ${value}` })
  }
  return parsed
}

export default defineEventHandler(async (event) => {
  const userId = await getEffectiveUserId(event)
  const query = getQuery(event)

  const start = query.start
    ? parseDateOnlyUtcStart(query.start as string)
    : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z')
  const end = query.end
    ? parseDateOnlyUtcEnd(query.end as string)
    : new Date(
        new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) +
          'T23:59:59.999Z'
      )

  try {
    const plan = await nutritionPlanService.getPlanForRange(userId, start, end)
    return plan
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch nutrition plan'
    })
  }
})
