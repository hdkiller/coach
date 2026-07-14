import { logger, schedules, task, tasks } from '@trigger.dev/sdk/v3'
import { getUserTimezone, getUserLocalDate } from '../server/utils/date'
import { metabolicService } from '../server/utils/services/metabolicService'
import { prisma } from '../server/utils/db'

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

export const finalizeDailyNutritionCron = schedules.task({
  id: 'finalize-daily-nutrition-cron',
  // Run daily (02:10) to persist yesterday/today chain state.
  cron: '10 2 * * *',
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

    const batchSize = 25
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)
      await Promise.all(
        batch.map((u) =>
          tasks.trigger('finalize-daily-nutrition', {
            userId: u.id
          })
        )
      )
    }

    return { success: true, count: users.length }
  }
})
