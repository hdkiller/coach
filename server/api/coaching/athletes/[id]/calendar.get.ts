import { z } from 'zod'
import { getCalendarDataForUser } from '../../../../utils/calendar-data'
import { requireCoachAccessToAthlete } from '../../../../utils/coaching-auth'

const paramsSchema = z.object({
  id: z.string()
})

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

  return await getCalendarDataForUser(athleteId, startDate, endDate, {
    includeNutrition: false,
    includeGoals: false,
    includeThresholds: false,
    includePersonalBests: false
  })
})
