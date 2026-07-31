import { logger, task } from '@trigger.dev/sdk/v3'
import { getUserTimezone, getUserLocalDate } from '../server/utils/date'
import { metabolicService } from '../server/utils/services/metabolicService'
import { prisma } from '../server/utils/db'
import { dispatchTask } from '../server/utils/task-dispatcher'

export const finalizeDailyNutritionTask = task({
  id: 'finalize-daily-nutrition',
  run: async (payload: { userId: string; date?: string }) => {
    const { userId, date } = payload
    const timezone = await getUserTimezone(userId)
    const targetDate = date ? new Date(date) : getUserLocalDate(timezone)

    logger.log('Manually finalizing nutrition', { userId, targetDate: targetDate.toISOString() })

    await metabolicService.finalizeDay(userId, targetDate)

    return {
      success: true
    }
  }
})

// CW-188: This used to be a `schedules.task` with a declarative `cron`, which
// keeps re-registering an active schedule trigger on Trigger.dev Cloud every
// time it's deployed there. Actual scheduling now happens exclusively via
// cw:worker's Redis/BullMQ job scheduler (see cli/worker/start.ts,
// registerScheduledTasks), driven off the `schedule.cron` entry for this task
// id in server/utils/task-manifest.json. Keep this a plain `task()` so no
// declarative schedule gets synced back to Trigger.dev Cloud.
export const finalizeDailyNutritionCron = task({
  id: 'finalize-daily-nutrition-cron',
  // Actual cron ("10 2 * * *", run daily at 02:10 UTC) lives in
  // server/utils/task-manifest.json and is registered by cw:worker.
  run: async () => {
    const users = await prisma.user.findMany({
      where: {
        deactivatedAt: null,
        nutritionTrackingEnabled: true
      },
      select: {
        id: true
      }
    })

    logger.log('Finalizing daily nutrition for users', { count: users.length })

    let dispatchedCount = 0
    let failedCount = 0
    const batchSize = 25
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(async (u) => {
          try {
            await dispatchTask('finalize-daily-nutrition', {
              userId: u.id
            })
            return true
          } catch (error) {
            logger.error('Failed to dispatch finalize-daily-nutrition', {
              userId: u.id,
              error
            })
            return false
          }
        })
      )

      for (const ok of results) {
        if (ok) dispatchedCount++
        else failedCount++
      }
    }

    if (failedCount > 0) {
      logger.warn('Finalize daily nutrition cron completed with partial failures', {
        count: users.length,
        dispatchedCount,
        failedCount
      })
    }

    return {
      success: failedCount === 0,
      count: users.length,
      dispatchedCount,
      failedCount
    }
  }
})
