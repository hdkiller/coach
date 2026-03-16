import { requireAuth } from '../utils/auth-guard'
import { getStartOfYearUTC, getUserLocalDate, getUserTimezone } from '../utils/date'
import { getRecoveryContextItemsForUser } from '../utils/services/recoveryContextService'

defineRouteMeta({
  openAPI: {
    tags: ['Recovery Context'],
    summary: 'List unified recovery context items',
    description:
      'Returns imported wellness periods, manual journey events, and completed daily check-ins in one normalized response.',
    security: [{ bearerAuth: [] }]
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['health:read'])
  const timezone = await getUserTimezone(user.id)
  const query = getQuery(event)

  const endDate = getUserLocalDate(timezone)
  endDate.setUTCHours(23, 59, 59, 999)

  let startDate = getUserLocalDate(timezone)

  if (query.startDate && query.endDate) {
    startDate = new Date(String(query.startDate))
    startDate.setUTCHours(0, 0, 0, 0)
    endDate.setTime(new Date(String(query.endDate)).getTime())
    endDate.setUTCHours(23, 59, 59, 999)
  } else if (query.days === 'YTD') {
    startDate = getStartOfYearUTC(timezone)
  } else {
    const days = parseInt(String(query.days || 30)) || 30
    startDate.setUTCDate(startDate.getUTCDate() - days)
    startDate.setUTCHours(0, 0, 0, 0)
  }

  const items = await getRecoveryContextItemsForUser(user.id, {
    startDate,
    endDate
  })

  return items.map((item) => ({
    ...item,
    startAt: item.startAt.toISOString(),
    endAt: item.endAt.toISOString()
  }))
})
