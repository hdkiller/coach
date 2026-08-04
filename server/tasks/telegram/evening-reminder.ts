import { prisma } from '../../utils/db'
import { sendTelegramMessage } from '../../utils/telegram'

export default defineTask({
  async run() {
    console.log('[Task] Running evening-reminder telegram broadcast...')

    const config = useRuntimeConfig()

    // Check task config
    const taskConfig = await prisma.scheduledTaskConfig.findUnique({
      where: { taskName: 'telegram:evening-reminder' }
    })

    if (taskConfig && !taskConfig.enabled) {
      console.log('[Task] Task is disabled in config, skipping.')
      return { status: 'SKIPPED' }
    }

    try {
      // 1. General Team Reminder
      if (config.telegramGroupChatId) {
        const teamMessage = `🌙 <b>Evening Reminder</b>\n\nDon't forget to submit your daily/weekly check-ins to keep your coaches in the loop! Rest up and recover well. 🏃‍♂️💨`
        await sendTelegramMessage(teamMessage, config.telegramGroupChatId)
      } else {
        console.warn('[Task] telegramGroupChatId missing, skipping team reminder.')
      }

      // 2. Summary of missing 1:1 check-ins for the Admin
      if (config.telegramAdminChatId) {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        // Find 1:1 athletes who haven't submitted a DailyCheckin today
        const missingAthletes = await prisma.user.findMany({
          where: {
            role: { in: ['UNLOCK', 'UNLEASH'] },
            dailyCheckins: {
              none: {
                date: { gte: todayStart }
              }
            }
          },
          select: { name: true, email: true }
        })

        let adminMessage = `📊 <b>Missing 1:1 Check-Ins Summary</b>\n\n`
        if (missingAthletes.length === 0) {
          adminMessage += `All 1:1 athletes have submitted their daily check-in today! 🎉`
        } else {
          adminMessage += `The following 1:1 athletes have not checked in today:\n`
          missingAthletes.forEach((athlete) => {
            adminMessage += `- ${athlete.name || athlete.email}\n`
          })
        }
        await sendTelegramMessage(adminMessage, config.telegramAdminChatId)
      } else {
        console.warn('[Task] telegramAdminChatId missing, skipping admin reminder.')
      }

      console.log('[Task] Evening reminder sent successfully.')

      if (taskConfig) {
        await prisma.scheduledTaskConfig.update({
          where: { taskName: 'telegram:evening-reminder' },
          data: { lastRunAt: new Date(), lastStatus: 'SUCCESS', lastError: null }
        })
      }

      return { result: 'Success' }
    } catch (e) {
      console.error('[Task] Error running evening-reminder', e)

      if (taskConfig) {
        await prisma.scheduledTaskConfig.update({
          where: { taskName: 'telegram:evening-reminder' },
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
