import { dailyCheckinRepository } from '../../utils/repositories/dailyCheckinRepository'
import { getUserTimezone, getUserLocalDate } from '../../utils/date'
import { tasks } from '@trigger.dev/sdk/v3'
import type { generateDailyCheckinTask } from '../../../trigger/daily-checkin'
import { checkQuota } from '../../utils/quotas/engine'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = session.user.id
  // 0. Quota Check
  await checkQuota(userId, 'daily_checkin')

  const timezone = await getUserTimezone(userId)
  const today = getUserLocalDate(timezone)

  // Check if already exists
  const checkin = await dailyCheckinRepository.getByDate(userId, today)

  // Check if stuck in PENDING state (older than 30s)
  const isStuckPending =
    checkin?.status === 'PENDING' && Date.now() - checkin.updatedAt.getTime() > 30 * 1000

  // If exists and completed/pending (and not stuck), return it (unless force regenerate)
  // The UI can handle "regenerate" by passing a flag.
  const body = await readBody(event).catch(() => ({}))
  const force = body.force === true

  if (checkin && !force && !isStuckPending) {
    return checkin
  }

  // Trigger the task (without creating a DB record first)
  // If forced or stuck, use a unique key to bypass idempotency TTL
  const idempotencyKey =
    checkin && (force || isStuckPending)
      ? `${userId}-${today.getTime()}-${Date.now()}`
      : `${userId}-${today.getTime()}`

  const handle = await tasks.trigger<typeof generateDailyCheckinTask>(
    'generate-daily-checkin',
    {
      userId,
      date: today,
      checkinId: checkin?.id // Pass ID if it exists, otherwise task handles it
    },
    {
      concurrencyKey: userId,
      tags: [`user:${userId}`],
      idempotencyKey,
      idempotencyKeyTTL: '1m'
    }
  )

  // Return existing checkin if available, otherwise a placeholder
  // The UI will switch to "Loading" because of the task trigger + WebSocket
  if (checkin) {
    return { ...checkin, status: 'PENDING' } // Hint to UI that it's updating
  }

  return {
    status: 'PENDING',
    date: today,
    questions: []
  }
})
