import { schedules, tasks } from '@trigger.dev/sdk/v3'
import { prisma } from '../server/utils/db'
import { getUserTimezone, getUserLocalDate } from '../server/utils/date'
import type { UltrahumanSettings } from '../server/utils/ultrahuman'

export const pollUltrahumanTask = schedules.task({
  id: 'poll-ultrahuman',
  cron: '5 * * * *', // Run at 5 minutes past every hour
  run: async (payload) => {
    const now = new Date(payload.timestamp)

    // 1. Find all Ultrahuman integrations
    const integrations = await prisma.integration.findMany({
      where: {
        provider: 'ultrahuman'
      },
      include: {
        user: true
      }
    })

    console.log(`[Ultrahuman Poller] Found ${integrations.length} integrations to check.`)

    for (const integration of integrations) {
      try {
        const settings = (integration.settings as unknown as UltrahumanSettings) || {}

        // Skip if auto-sync is explicitly disabled
        if (settings.autoSync === false) {
          continue
        }

        const userId = integration.userId
        const timezone = await getUserTimezone(userId)
        const userNow = getUserLocalDate(timezone, now)
        const userHour = userNow.getUTCHours() // 0-23 in user's local time (normalized to UTC date object)

        let shouldTrigger = false

        // A. Check Preferred Sync Time (HH:mm)
        if (settings.preferredSyncTime) {
          const [prefHour] = settings.preferredSyncTime.split(':').map(Number)
          if (userHour === prefHour) {
            console.log(
              `[Ultrahuman Poller] Hour matches preferred time (${prefHour}:00) for user ${userId}`
            )
            shouldTrigger = true
          }
        }

        // B. Safety fallback: Sync every 6 hours if no match yet
        // This ensures data stays fresh even if preferred time is missed or not set
        if (!shouldTrigger && userHour % 6 === 0) {
          console.log(`[Ultrahuman Poller] 6-hour window trigger for user ${userId}`)
          shouldTrigger = true
        }

        if (shouldTrigger) {
          // Sync today and yesterday
          const startDate = new Date(userNow)
          startDate.setUTCDate(startDate.getUTCDate() - 1)
          const endDate = new Date(userNow)

          console.log(
            `[Ultrahuman Poller] Triggering ingestion for ${userId} (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`
          )

          await tasks.trigger(
            'ingest-ultrahuman',
            {
              userId,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString()
            },
            {
              concurrencyKey: userId,
              tags: [`user:${userId}`, 'auto-poll']
            }
          )
        }
      } catch (err) {
        console.error(`[Ultrahuman Poller] Error processing integration ${integration.id}:`, err)
      }
    }
  }
})
