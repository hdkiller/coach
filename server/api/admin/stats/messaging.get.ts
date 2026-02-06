import { defineEventHandler, createError } from 'h3'
import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const [telegramUsers, totalMessages, messagesLast24h, recentLogs] = await Promise.all([
    prisma.integration.count({ where: { provider: 'telegram' } }),
    prisma.webhookLog.count({ where: { provider: 'telegram' } }),
    prisma.webhookLog.count({
      where: {
        provider: 'telegram',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    }),
    prisma.webhookLog.findMany({
      where: { provider: 'telegram' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        eventType: true,
        status: true,
        createdAt: true,
        error: true,
        provider: true
      }
    })
  ])

  // Get daily volume for last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const dailyVolumeRaw = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
    SELECT DATE("createdAt") as date, COUNT(*) as count
    FROM "WebhookLog"
    WHERE "createdAt" >= ${sevenDaysAgo} AND "provider" = 'telegram'
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `

  const dailyVolume = dailyVolumeRaw.map((row) => ({
    date: new Date(row.date).toISOString().split('T')[0],
    count: Number(row.count)
  }))

  return {
    telegram: {
      users: telegramUsers,
      totalMessages,
      dailyActive: messagesLast24h
    },
    dailyVolume,
    logs: recentLogs
  }
})
