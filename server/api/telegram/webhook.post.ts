import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import pg from 'pg'
import { sendTelegramMessage } from '../../utils/telegram'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const secretToken = getHeader(event, 'x-telegram-bot-api-secret-token')

  if (config.telegramWebhookSecret && secretToken !== config.telegramWebhookSecret) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  if (!body || !body.message || !body.message.text) {
    return { status: 'ignored' }
  }

  const text = (body.message.text as string).trim()
  const chatId = String(body.message.chat.id)

  const connectionString = process.env.DATABASE_URL
  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    if (text.startsWith('/status')) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const dailyCount = await prisma.dailyCheckin.count({
        where: { createdAt: { gte: yesterday } }
      })
      const weeklyCount = await prisma.checkIn.count({ where: { createdAt: { gte: yesterday } } })

      const msg = `🟢 <b>System Status: Online</b>\n\nCheck-Ins in last 24h:\n- Daily: ${dailyCount}\n- Weekly: ${weeklyCount}`
      await sendTelegramMessage(msg, chatId)
    } else if (text.startsWith('/races')) {
      const now = new Date()
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const upcomingEvents = await prisma.event.findMany({
        where: {
          date: { gte: now, lte: nextWeek }
        },
        include: { participants: true },
        orderBy: { date: 'asc' }
      })

      if (upcomingEvents.length === 0) {
        await sendTelegramMessage('No upcoming races in the next 7 days.', chatId)
      } else {
        let msg = `🏁 <b>Upcoming Races (Next 7 Days)</b>\n\n`
        for (const ev of upcomingEvents) {
          msg += `📍 <b>${ev.title}</b> - ${ev.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}\n`
          const participants = ev.participants.map((p) => p.name || p.email).join(', ')
          msg += `👥 ${participants || 'None'}\n\n`
        }
        await sendTelegramMessage(msg, chatId)
      }
    } else if (text.startsWith('/summary')) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const dailyCheckins = await prisma.dailyCheckin.findMany({
        where: {
          createdAt: { gte: yesterday },
          user: { role: { in: ['UNLOCK', 'UNLEASH', 'UNCOVER'] } }
        }
      })
      const weeklyCheckins = await prisma.checkIn.findMany({
        where: {
          createdAt: { gte: yesterday },
          user: { role: { in: ['UNLOCK', 'UNLEASH', 'UNCOVER'] } }
        }
      })

      const totalCheckIns = dailyCheckins.length + weeklyCheckins.length
      const highPainFlags = weeklyCheckins.filter(
        (c) => c.wellnessPainScore && c.wellnessPainScore >= 5
      ).length

      let msg = `🚴 <b>Morning Athlete Briefing</b>\n\n<b>${totalCheckIns}</b> Check-Ins Received in the last 24h\n`
      if (highPainFlags > 0) {
        msg += `⚠️ <b>${highPainFlags}</b> High Pain Flag(s) reported!\n`
      } else {
        msg += `✅ No new pain flags reported.\n`
      }
      await sendTelegramMessage(msg, chatId)
    }

    await prisma.$disconnect()
    return { status: 'ok' }
  } catch (err) {
    console.error('[Telegram Webhook Error]', err)
    await prisma.$disconnect()
    return { status: 'error' }
  }
})
