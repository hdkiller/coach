import { prisma } from '../../utils/db'
import { sendTelegramMessage } from '../../utils/telegram'

export default defineTask({
  async run() {
    console.log('[Task] Running morning-summary telegram broadcast...')

    const config = useRuntimeConfig()
    if (!config.telegramAdminChatId) {
      console.warn('[Task] telegramAdminChatId is missing, skipping.')
      return { result: 'Skipped' }
    }

    // Check task config
    const taskConfig = await prisma.scheduledTaskConfig.findUnique({
      where: { taskName: 'telegram:morning-summary' }
    })

    if (taskConfig && !taskConfig.enabled) {
      console.log('[Task] Task is disabled in config, skipping.')
      return { status: 'SKIPPED' }
    }

    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const dailyCheckins = await prisma.dailyCheckin.findMany({
        where: {
          createdAt: { gte: yesterday },
          user: { role: { in: ['UNLOCK', 'UNLEASH', 'UNCOVER'] } }
        },
        include: { user: true }
      })

      const weeklyCheckins = await prisma.checkIn.findMany({
        where: {
          createdAt: { gte: yesterday },
          user: { role: { in: ['UNLOCK', 'UNLEASH', 'UNCOVER'] } }
        },
        include: { user: true }
      })

      const totalCheckIns = dailyCheckins.length + weeklyCheckins.length
      const highPainFlags = weeklyCheckins.filter(
        (c) => c.wellnessPainScore && c.wellnessPainScore >= 5
      ).length

      // Add logic to check dailyCheckins for pain if they have a standard json format,
      // but for now relying on weeklyCheckins wellnessPainScore.

      let message = `🚴 <b>Morning Athlete Briefing</b>\n\n`
      message += `<b>${totalCheckIns}</b> Check-Ins Received in the last 24h\n`
      if (highPainFlags > 0) {
        message += `⚠️ <b>${highPainFlags}</b> High Pain Flag(s) reported!\n`
      } else {
        message += `✅ No new pain flags reported.\n`
      }

      message += `\n<i>Have a great coaching day!</i>`

      await sendTelegramMessage(message, config.telegramAdminChatId)

      console.log('[Task] Morning summary sent successfully.')

      if (taskConfig) {
        await prisma.scheduledTaskConfig.update({
          where: { taskName: 'telegram:morning-summary' },
          data: { lastRunAt: new Date(), lastStatus: 'SUCCESS', lastError: null }
        })
      }

      return { result: 'Success', totalCount: totalCheckIns, painFlags: highPainFlags }
    } catch (e) {
      console.error('[Task] Error running morning-summary', e)

      if (taskConfig) {
        await prisma.scheduledTaskConfig.update({
          where: { taskName: 'telegram:morning-summary' },
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
