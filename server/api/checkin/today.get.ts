import { requireAuth } from '../../utils/auth-guard'
import { getUserTimezone, getUserLocalDate } from '../../utils/date'
import { dailyCheckinRepository } from '../../utils/repositories/dailyCheckinRepository'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['health:read'])
  const userId = user.id
  const timezone = await getUserTimezone(userId)
  const today = getUserLocalDate(timezone)

  let checkin = await dailyCheckinRepository.getByDate(userId, today)

  // Auto-recover stuck records (zombies)
  if (checkin && (checkin.status === 'PENDING' || checkin.status === 'PROCESSING')) {
    const isStuck = Date.now() - checkin.updatedAt.getTime() > 60 * 1000 // 1 minute timeout

    if (isStuck) {
      const hasQuestions =
        checkin.questions && Array.isArray(checkin.questions) && checkin.questions.length > 0

      const newStatus = hasQuestions ? 'COMPLETED' : 'FAILED'

      checkin = await dailyCheckinRepository.update(checkin.id, {
        status: newStatus
      })
    }
  }

  return checkin
})
