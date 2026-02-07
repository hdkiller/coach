import { defineEventHandler, createError, getQuery } from 'h3'
import { Prisma } from '@prisma/client'
import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import { getStartOfDaysAgoUTC } from '../../../../utils/date'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const query = getQuery(event)
  const period = (query.period as string) || 'yesterday'

  // Determine filtering range
  const todayStart = getStartOfDaysAgoUTC('UTC', 0)
  const yesterdayStart = getStartOfDaysAgoUTC('UTC', 1)
  const thisWeekStart = getStartOfDaysAgoUTC('UTC', 7)
  const lastWeekStart = getStartOfDaysAgoUTC('UTC', 14)
  const thirtyDaysAgo = getStartOfDaysAgoUTC('UTC', 30)

  let filterStart = yesterdayStart
  let filterEnd: Date | undefined = todayStart

  switch (period) {
    case 'today':
      filterStart = todayStart
      filterEnd = undefined
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
      filterStart = new Date(0)
      filterEnd = undefined
      break
  }

  // 1. Operation Summary Table (Filtered)
  const operationStatsRaw = await prisma.$queryRaw<
    {
      operation: string
      total_cost: number
      request_count: bigint
      user_count: bigint
      avg_tokens: number
      avg_reasoning: number
      failure_count: bigint
    }[]
  >`
    SELECT 
      operation,
      SUM(COALESCE("estimatedCost", 0)) as total_cost,
      COUNT(*) as request_count,
      COUNT(DISTINCT "userId") as user_count,
      AVG(COALESCE("totalTokens", 0)) as avg_tokens,
      AVG(COALESCE("reasoningTokens", 0)) as avg_reasoning,
      SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failure_count
    FROM "LlmUsage"
    WHERE "createdAt" >= ${filterStart}
      ${filterEnd ? Prisma.sql`AND "createdAt" < ${filterEnd}` : Prisma.empty}
    GROUP BY operation
    ORDER BY total_cost DESC
  `

  const operations = operationStatsRaw.map((row) => ({
    name: row.operation,
    totalCost: Number(row.total_cost || 0),
    requests: Number(row.request_count),
    users: Number(row.user_count),
    avgCostPerRequest:
      Number(row.request_count) > 0 ? Number(row.total_cost || 0) / Number(row.request_count) : 0,
    avgCostPerUser:
      Number(row.user_count) > 0 ? Number(row.total_cost || 0) / Number(row.user_count) : 0,
    avgTokens: Math.round(Number(row.avg_tokens || 0)),
    avgReasoningTokens: Math.round(Number(row.avg_reasoning || 0)),
    failureRate:
      Number(row.request_count) > 0
        ? (Number(row.failure_count) / Number(row.request_count)) * 100
        : 0
  }))

  // 2. Daily Reasoning Token Trend (Fixed 30d Trend for Context)
  const dailyReasoningRaw = await prisma.$queryRaw<
    { date: string; operation: string; tokens: bigint }[]
  >`
    SELECT DATE("createdAt") as date, operation, SUM(COALESCE("reasoningTokens", 0)) as tokens
    FROM "LlmUsage"
    WHERE "createdAt" >= ${thirtyDaysAgo} AND "reasoningTokens" > 0
    GROUP BY DATE("createdAt"), operation
    ORDER BY date ASC
  `

  const dailyReasoning = dailyReasoningRaw.map((row) => ({
    date: new Date(row.date).toISOString().split('T')[0],
    operation: row.operation,
    tokens: Number(row.tokens)
  }))

  // 3. Daily Cost by Operation (Fixed 30d Trend for Context)
  const dailyCostsRaw = await prisma.$queryRaw<{ date: string; operation: string; cost: number }[]>`
    SELECT DATE("createdAt") as date, operation, SUM("estimatedCost") as cost
    FROM "LlmUsage"
    WHERE "createdAt" >= ${thirtyDaysAgo}
    GROUP BY DATE("createdAt"), operation
    ORDER BY date ASC
  `

  const dailyCosts = dailyCostsRaw.map((row) => ({
    date: new Date(row.date).toISOString().split('T')[0],
    operation: row.operation,
    cost: Number(row.cost || 0)
  }))

  return {
    period,
    operations,
    dailyReasoning,
    dailyCosts
  }
})
