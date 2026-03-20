import { getServerSession } from '../../utils/session'
import { getCalendarDataForUser } from '../../utils/calendar-data'

defineRouteMeta({
  openAPI: {
    tags: ['Calendar'],
    summary: 'Get calendar activities',
    description:
      'Returns a combined list of completed and planned workouts, along with nutrition and wellness data.',
    parameters: [
      {
        name: 'startDate',
        in: 'query',
        required: true,
        schema: { type: 'string', format: 'date-time' }
      },
      {
        name: 'endDate',
        in: 'query',
        required: true,
        schema: { type: 'string', format: 'date-time' }
      }
    ],
    responses: {
      200: { description: 'Success' },
      400: { description: 'Invalid date parameters' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const query = getQuery(event)
  const startDate = query.startDate ? new Date(query.startDate as string) : new Date()
  const endDate = query.endDate ? new Date(query.endDate as string) : new Date()

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw createError({
      statusCode: 400,
      message: 'Invalid date parameters'
    })
  }

  const userId = (session.user as any).id
  return await getCalendarDataForUser(userId, startDate, endDate, {
    includeNutrition: true,
    includeGoals: true,
    includeThresholds: true,
    includePersonalBests: true
  })
})
