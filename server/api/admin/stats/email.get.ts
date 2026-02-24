import { defineEventHandler, createError } from 'h3'
import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    totalStats,
    dailyStatsRaw,
    templateStatsRaw,
    audienceStatsRaw,
    suppressionStatsRaw,
    staleQueue,
    recentFailures
  ] = await Promise.all([
    // 1. Total Stats
    prisma.emailDelivery.groupBy({
      by: ['status'],
      _count: {
        _all: true
      }
    }),

    // 2. Daily Volume and Status trends
    prisma.$queryRaw<{ date: string; status: string; count: bigint }[]>`
      SELECT DATE_TRUNC('day', "createdAt") as date, status, COUNT(*) as count
      FROM "EmailDelivery"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY date, status
      ORDER BY date ASC
    `,

    // 3. Top Templates
    prisma.emailDelivery.groupBy({
      by: ['templateKey'],
      _count: {
        _all: true
      },
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: {
        _count: {
          templateKey: 'desc'
        }
      },
      take: 10
    }),

    // 4. Audience Distribution
    prisma.emailDelivery.groupBy({
      by: ['audience'],
      _count: {
        _all: true
      }
    }),

    // 5. Suppression Stats
    prisma.emailSuppression.groupBy({
      by: ['reason'],
      _count: {
        _all: true
      },
      where: {
        active: true
      }
    }),

    // 6. Queue Aging (for manual approval workflow)
    prisma.emailDelivery.count({
      where: {
        status: 'QUEUED',
        createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Older than 24h
      }
    }),

    // 7. Recent Failures
    prisma.emailDelivery.count({
      where: {
        status: 'FAILED',
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })
  ])

  // Get template performance (Open/Click rates)
  const templatePerformanceRaw = await prisma.$queryRaw<
    { templateKey: string; delivered: bigint; opened: bigint; clicked: bigint }[]
  >`
    SELECT 
      "templateKey",
      COUNT(*) FILTER (WHERE status IN ('DELIVERED', 'OPENED', 'CLICKED')) as delivered,
      COUNT(*) FILTER (WHERE status IN ('OPENED', 'CLICKED')) as opened,
      COUNT(*) FILTER (WHERE status = 'CLICKED') as clicked
    FROM "EmailDelivery"
    WHERE "createdAt" >= ${thirtyDaysAgo}
    GROUP BY "templateKey"
    HAVING COUNT(*) > 0
    ORDER BY COUNT(*) DESC
    LIMIT 10
  `

  const totals = totalStats.reduce(
    (acc, curr) => {
      acc[curr.status] = Number(curr._count._all)
      acc.total = (acc.total || 0) + Number(curr._count._all)
      return acc
    },
    { total: 0 } as Record<string, number>
  )

  const dailyTrends = dailyStatsRaw.map((row) => ({
    date: row.date,
    status: row.status,
    count: Number(row.count)
  }))

  const templateUsage = templateStatsRaw.map((row) => ({
    template: row.templateKey,
    count: Number(row._count._all)
  }))

  const templatePerformance = templatePerformanceRaw.map((row) => ({
    template: row.templateKey,
    delivered: Number(row.delivered),
    opened: Number(row.opened),
    clicked: Number(row.clicked),
    openRate: row.delivered > 0 ? (Number(row.opened) / Number(row.delivered)) * 100 : 0,
    clickRate: row.opened > 0 ? (Number(row.clicked) / Number(row.opened)) * 100 : 0
  }))

  const audienceDistribution = audienceStatsRaw.map((row) => ({
    audience: row.audience,
    count: Number(row._count._all)
  }))

  const suppressions = suppressionStatsRaw.map((row) => ({
    reason: row.reason,
    count: Number(row._count._all)
  }))

  return {
    totals,
    dailyTrends,
    templateUsage,
    templatePerformance,
    audienceDistribution,
    suppressions,
    queueTotal: Number(totals.QUEUED || 0),
    staleQueue: Number(staleQueue || 0),
    recentFailures: Number(recentFailures || 0)
  }
})
