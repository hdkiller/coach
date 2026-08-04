import { prisma } from '../../utils/db'
import { sendTelegramMessage } from '../../utils/telegram'

export default defineTask({
  async run() {
    console.log('[Task] Running weekend-race-broadcast telegram broadcast...')

    const config = useRuntimeConfig()

    if (!config.telegramGroupChatId) {
      console.warn('[Task] telegramGroupChatId is missing, skipping.')
      return { result: 'Skipped' }
    }

    // Check task config
    const taskConfig = await prisma.scheduledTaskConfig.findUnique({
      where: { taskName: 'telegram:weekend-race-broadcast' }
    })

    if (taskConfig && !taskConfig.enabled) {
      console.log('[Task] Task is disabled in config, skipping.')
      return { status: 'SKIPPED' }
    }

    try {
      const now = new Date()
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const upcomingEvents = await prisma.event.findMany({
        where: {
          date: {
            gte: now,
            lte: nextWeek
          }
        },
        include: { participants: true },
        orderBy: { date: 'asc' }
      })

      if (upcomingEvents.length === 0) {
        console.log('[Task] No upcoming races this weekend.')
        return { result: 'Success', message: 'No events' }
      }

      let message = `🏁 <b>Tri Nerds Race Weekend Preview</b> 🏁\n\nGood luck to everyone racing in the upcoming week!\n\n`

      for (const event of upcomingEvents) {
        message += `📍 <b>${event.title}</b>\n`
        if (event.location || event.city) {
          message += `🗺️ ${event.location || event.city}\n`
        }
        const dateStr = event.date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })
        message += `🗓️ ${dateStr}\n`

        if (event.participants && event.participants.length > 0) {
          message += `👥 Racing: `
          const names = event.participants.map((p) => p.name || p.email).join(', ')
          message += `${names}\n`
        } else {
          message += `👥 Racing: No Tri Nerds registered yet.\n`
        }
        message += `\n`
      }

      message += `<i>Go crush it out there!</i> 💥`

      await sendTelegramMessage(message, config.telegramGroupChatId)

      console.log('[Task] Weekend race broadcast sent successfully.')

      if (taskConfig) {
        await prisma.scheduledTaskConfig.update({
          where: { taskName: 'telegram:weekend-race-broadcast' },
          data: { lastRunAt: new Date(), lastStatus: 'SUCCESS', lastError: null }
        })
      }

      return { result: 'Success' }
    } catch (e) {
      console.error('[Task] Error running weekend-race-broadcast', e)

      if (taskConfig) {
        await prisma.scheduledTaskConfig.update({
          where: { taskName: 'telegram:weekend-race-broadcast' },
          data: {
            lastRunAt: new Date(),
            lastStatus: 'FAILED',
            lastError: e instanceof Error ? e.message : String(e)
          }
        })
      }

      return { error: e }
    }
  }
})
