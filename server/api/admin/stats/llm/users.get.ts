import { defineEventHandler, createError, getQuery } from 'h3'
import { Prisma } from '@prisma/client'
import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import { getStartOfDaysAgoUTC, getStartOfDayUTC } from '../../../../utils/date'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const query = getQuery(event)
  const period = (query.period as string) || 'yesterday'

  // Fixed ranges for comparison cards
  const todayStart = getStartOfDaysAgoUTC('UTC', 0)
  const yesterdayStart = getStartOfDaysAgoUTC('UTC', 1)
  const thisWeekStart = getStartOfDaysAgoUTC('UTC', 7)
  const lastWeekStart = getStartOfDaysAgoUTC('UTC', 14)
  const thirtyDaysAgo = getStartOfDaysAgoUTC('UTC', 30)

  // Determine filtering range for specific charts
  let filterStart = yesterdayStart
  let filterEnd: Date | undefined = todayStart // Default to yesterday (start of yesterday to start of today)

  switch (period) {
    case 'today':
      filterStart = todayStart
      filterEnd = undefined // To Now
      break
    case 'yesterday':
      filterStart = yesterdayStart
      filterEnd = todayStart
      break
    case 'this_week':
      filterStart = thisWeekStart
      filterEnd = undefined
      break
    case 'past_week':
      filterStart = lastWeekStart
      filterEnd = thisWeekStart
      break
    case 'this_month':
      filterStart = thirtyDaysAgo
      filterEnd = undefined
      break
    case 'all_time':
      filterStart = new Date(0) // Epoch
      filterEnd = undefined
      break
  }

  // Helper to calculate avg cost per user for a time range
  const getAverageCostPerUser = async (startDate: Date, endDate?: Date) => {
    const where: any = { createdAt: { gte: startDate }, userId: { not: null } }
    if (endDate) where.createdAt.lt = endDate

    const result = await prisma.llmUsage.aggregate({
      where,
      _sum: { estimatedCost: true }
    })

    const uniqueUsers = await prisma.llmUsage.groupBy({
      by: ['userId'],
      where,
      _count: { userId: true }
    })

    const totalCost = result._sum.estimatedCost || 0
    const userCount = uniqueUsers.length

    return {
      totalCost,
      userCount,
      avgCost: userCount > 0 ? totalCost / userCount : 0
    }
  }

  // 0. Time Period Averages (Fixed Context)
  const [avgToday, avgYesterday, avgThisWeek, avgLastWeek] = await Promise.all([
    getAverageCostPerUser(todayStart),
    getAverageCostPerUser(yesterdayStart, todayStart),
    getAverageCostPerUser(thisWeekStart),
    getAverageCostPerUser(lastWeekStart, thisWeekStart)
  ])

  // 1. Tier Economics (Filtered)
  const tierStatsRaw = await prisma.$queryRaw<
    { tier: string; total_cost: number; active_users: bigint }[]
  >`
    SELECT 
      u."subscriptionTier" as tier,
      SUM(COALESCE(lu."estimatedCost", 0)) as total_cost,
      COUNT(DISTINCT lu."userId") as active_users
    FROM "LlmUsage" lu
    JOIN "User" u ON lu."userId" = u.id
    WHERE lu."createdAt" >= ${filterStart}
      ${filterEnd ? Prisma.sql`AND lu."createdAt" < ${filterEnd}` : Prisma.empty}
    GROUP BY u."subscriptionTier"
  `

  const tierStats = tierStatsRaw.map((row) => ({
    tier: row.tier,
    totalCost: Number(row.total_cost || 0),
    activeUsers: Number(row.active_users),
    avgCostPerUser:
      Number(row.active_users) > 0 ? Number(row.total_cost || 0) / Number(row.active_users) : 0
  }))

  // 2. Cost Distribution (Filtered)
  const userCostsRaw = await prisma.$queryRaw<{ user_id: string; total_cost: number }[]>`
    SELECT "userId" as user_id, SUM("estimatedCost") as total_cost
    FROM "LlmUsage"
    WHERE "createdAt" >= ${filterStart} 
      AND "userId" IS NOT NULL
      ${filterEnd ? Prisma.sql`AND "createdAt" < ${filterEnd}` : Prisma.empty}
    GROUP BY "userId"
  `

  const buckets = {
    '<$0.10': 0,
    '$0.10-$1.00': 0,
    '$1.00-$5.00': 0,
    '>$5.00': 0
  }

  userCostsRaw.forEach((row) => {
    const cost = Number(row.total_cost || 0)
    if (cost < 0.1) buckets['<$0.10']++
    else if (cost < 1.0) buckets['$0.10-$1.00']++
    else if (cost < 5.0) buckets['$1.00-$5.00']++
    else buckets['>$5.00']++
  })

  // 3. Top Spenders (Filtered)
  // Need to use Prisma.sql for dynamic date range in groupBy if raw, but groupBy is typed.
  // Prisma Client groupBy doesn't support raw fragments easily. Using findMany/aggregate logic or constructing where object.
  const whereTopSpenders: any = {
    createdAt: { gte: filterStart },
    userId: { not: null }
  }
  if (filterEnd) whereTopSpenders.createdAt.lt = filterEnd

  const topSpendersRaw = await prisma.llmUsage.groupBy({
    by: ['userId'],
    _sum: { estimatedCost: true, totalTokens: true },
    where: whereTopSpenders,
    orderBy: {
      _sum: {
        estimatedCost: 'desc'
      }
    },
    take: 20
  })

  const topSpenders = await Promise.all(
    topSpendersRaw.map(async (item) => {
      const user = await prisma.user.findUnique({
        where: { id: item.userId! },
        select: { name: true, email: true, subscriptionTier: true }
      })
      return {
        id: item.userId,
        name: user?.name,
        email: user?.email,
        tier: user?.subscriptionTier,
        totalCost: item._sum.estimatedCost || 0,
        totalTokens: item._sum.totalTokens || 0
      }
    })
  )

  // 4. Daily Active Users (Fixed 30d Trend)
  // Keeping this consistent to show recent activity regardless of filter
  const dailyActiveUsersRaw = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
    SELECT DATE("createdAt") as date, COUNT(DISTINCT "userId") as count
    FROM "LlmUsage"
    WHERE "createdAt" >= ${thirtyDaysAgo} AND "userId" IS NOT NULL
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `

  const dailyActiveUsers = dailyActiveUsersRaw.map((row) => ({
    date: new Date(row.date).toISOString().split('T')[0],
    count: Number(row.count)
  }))

  return {
    period,
    tierStats,
    costDistribution: buckets,
    topSpenders,
    dailyActiveUsers,
    averages: {
      today: avgToday,
      yesterday: avgYesterday,
      thisWeek: avgThisWeek,
      lastWeek: avgLastWeek
    }
  }
})
