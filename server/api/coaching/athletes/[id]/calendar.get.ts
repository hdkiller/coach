import { z } from 'zod/v3'
import { getCalendarDataForUser } from '../../../../utils/calendar-data'
import { requireCoachAccessToAthlete } from '../../../../utils/coaching-auth'

const paramsSchema = z.object({
  id: z.string()
})

const MAX_CALENDAR_RANGE_DAYS = 90
const MS_PER_DAY = 24 * 60 * 60 * 1000

export default defineEventHandler(async (event) => {
  const { id: athleteId } = await getValidatedRouterParams(event, paramsSchema.parse)
  await requireCoachAccessToAthlete(event, athleteId)

  const query = getQuery(event)
  const startDate = query.startDate ? new Date(query.startDate as string) : new Date()
  const endDate = query.endDate ? new Date(query.endDate as string) : new Date()

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw createError({
      statusCode: 400,
      message: 'Invalid date parameters'
    })
  }

  if (startDate > endDate) {
    throw createError({
      statusCode: 400,
      message: 'startDate must be on or before endDate'
    })
  }

  const rangeMs = endDate.getTime() - startDate.getTime()
  if (rangeMs > MAX_CALENDAR_RANGE_DAYS * MS_PER_DAY) {
    throw createError({
      statusCode: 400,
      message: `Date range cannot exceed ${MAX_CALENDAR_RANGE_DAYS} days`
    })
  }

  return await getCalendarDataForUser(athleteId, startDate, endDate, {
    includeNutrition: false,
    includeGoals: false,
    includeThresholds: false,
    includePersonalBests: false
  })
})
