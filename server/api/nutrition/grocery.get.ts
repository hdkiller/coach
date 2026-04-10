import { requireAuth } from '../../utils/auth-guard'
import { getEffectiveUserId } from '../../utils/coaching'
import { nutritionPlanService } from '../../utils/services/nutritionPlanService'

function parseDateOnlyUtc(value: string, field: string) {
  const dateOnly = value.slice(0, 10)
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw createError({ statusCode: 400, message: `Invalid ${field}: ${value}` })
  }
  return parsed
}

export default defineEventHandler(async (event) => {
  await requireAuth(event, ['nutrition:read'])
  const userId = await getEffectiveUserId(event)
  const query = getQuery(event)

  const now = new Date()
  const start = query.start
    ? parseDateOnlyUtc(String(query.start), 'start')
    : new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`)
  const end = query.end
    ? new Date(`${String(query.end).slice(0, 10)}T23:59:59.999Z`)
    : new Date(start.getTime() + 48 * 60 * 60 * 1000 - 1)

  const grocery = await nutritionPlanService.getGroceryList(userId, start, end)

  return {
    success: true,
    start: start.toISOString(),
    end: end.toISOString(),
    ...grocery
  }
})
