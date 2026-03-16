import { requireAuth } from '../../utils/auth-guard'
import { getUserLocalDate, getUserTimezone } from '../../utils/date'
import { dailyCheckinRepository } from '../../utils/repositories/dailyCheckinRepository'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['health:read'])
  const timezone = await getUserTimezone(user.id)
  const query = getQuery(event)
  const limit = Math.min(parseInt(String(query.limit || 14)) || 14, 60)

  const endDate = getUserLocalDate(timezone)
  endDate.setUTCHours(23, 59, 59, 999)

  const startDate = new Date(endDate)
  startDate.setUTCDate(startDate.getUTCDate() - limit)
  startDate.setUTCHours(0, 0, 0, 0)

  const checkins = await dailyCheckinRepository.getHistoryDetailed(user.id, startDate, endDate)

  return checkins.map((checkin) => ({
    ...checkin,
    date: checkin.date.toISOString()
  }))
})
