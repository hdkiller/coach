import { requireAuth } from '../../utils/auth-guard'
import { getStartOfYearUTC, getUserLocalDate, getUserTimezone } from '../../utils/date'
import { getWellnessEventOverlaysForUser } from '../../utils/services/wellnessEventService'

defineRouteMeta({
  openAPI: {
    tags: ['Wellness'],
    summary: 'List normalized wellness events',
    description:
      'Returns normalized wellness events from synced tags and wellness-related calendar periods for chart overlays and AI context.',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'days',
        in: 'query',
        schema: { type: ['integer', 'string'], default: 30 }
      }
    ],
    responses: {
      200: {
        description: 'Success'
      },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['health:read'])
  const userId = user.id
  const timezone = await getUserTimezone(userId)
  const query = getQuery(event)

  const endDate = getUserLocalDate(timezone)
  endDate.setUTCHours(23, 59, 59, 999)

  let startDate = getUserLocalDate(timezone)
  if (query.days === 'YTD') {
    startDate = getStartOfYearUTC(timezone)
  } else {
    const days = parseInt(query.days as string) || 30
    startDate.setUTCDate(startDate.getUTCDate() - days)
  }
  startDate.setUTCHours(0, 0, 0, 0)

  const overlays = await getWellnessEventOverlaysForUser(userId, {
    startDate,
    endDate
  })

  return overlays.map((eventItem) => ({
    ...eventItem,
    startDate: eventItem.startDate.toISOString(),
    endDate: eventItem.endDate.toISOString()
  }))
})
