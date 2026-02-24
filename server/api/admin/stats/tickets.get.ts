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
    statusStats,
    priorityStats,
    dailyTrendsRaw,
    totalTickets,
    resolvedLast30Days,
    avgResolutionTimeRaw
  ] = await Promise.all([
    // 1. Status Breakdown
    prisma.bugReport.groupBy({
      by: ['status'],
      _count: {
        _all: true
      }
    }),

    // 2. Priority Breakdown
    prisma.bugReport.groupBy({
      by: ['priority'],
      _count: {
        _all: true
      }
    }),

    // 3. Daily Volume trends (Created)
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*) as count
      FROM "BugReport"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY date
      ORDER BY date ASC
    `,

    // 4. Total Tickets
    prisma.bugReport.count(),

    // 5. Resolved in last 30 days
    prisma.bugReport.count({
      where: {
        status: 'RESOLVED',
        updatedAt: { gte: thirtyDaysAgo }
      }
    }),

    // 6. Avg Resolution Time (Difference between createdAt and updatedAt for RESOLVED tickets)
    prisma.$queryRaw<{ avg_days: number }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 86400) as avg_days
      FROM "BugReport"
      WHERE status = 'RESOLVED' AND "updatedAt" >= ${thirtyDaysAgo}
    `
  ])

  const totals = statusStats.reduce(
    (acc, curr) => {
      acc[curr.status] = Number(curr._count._all)
      return acc
    },
    {} as Record<string, number>
  )

  const priorities = priorityStats.reduce(
    (acc, curr) => {
      const p = curr.priority || 'MEDIUM'
      acc[p] = Number(curr._count._all)
      return acc
    },
    {} as Record<string, number>
  )

  const dailyTrends = dailyTrendsRaw.map((row) => ({
    date: row.date,
    count: Number(row.count)
  }))

  return {
    totals,
    priorities,
    dailyTrends,
    summary: {
      total: totalTickets,
      resolved30d: resolvedLast30Days,
      avgResolutionDays: Number(avgResolutionTimeRaw[0]?.avg_days || 0).toFixed(1)
    }
  }
})
