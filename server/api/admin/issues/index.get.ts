import { getServerSession } from '../../../utils/session'
import { issuesRepository } from '../../../utils/repositories/issuesRepository'
import { prisma } from '../../../utils/db'
import type { BugStatus } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 50
  let status = query.status as BugStatus | BugStatus[] | undefined

  // If status is passed as multiple query params, it might already be an array
  // If it's a comma-separated string, we should split it
  if (typeof status === 'string' && status.includes(',')) {
    status = status.split(',') as BugStatus[]
  }

  const search = query.search as string | undefined

  // Compute stats based on the search query but ignore status filter to show full breakdown
  const whereStats: any = {}
  if (search) {
    whereStats.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ]
  }

  const [listResult, statusCounts] = await Promise.all([
    issuesRepository.list({ status, search }, page, limit),
    prisma.bugReport.groupBy({
      by: ['status'],
      where: whereStats,
      _count: true
    })
  ])

  // Process stats
  const stats = {
    open: 0,
    needMoreInfo: 0,
    resolved: 0,
    total: 0
  }

  statusCounts.forEach((c) => {
    const count = c._count
    stats.total += count
    if (c.status === 'OPEN') stats.open += count
    if (c.status === 'NEED_MORE_INFO') stats.needMoreInfo += count
    if (c.status === 'RESOLVED') stats.resolved += count
  })

  return {
    count: listResult.total,
    reports: listResult.items,
    page,
    limit,
    totalPages: listResult.totalPages,
    stats
  }
})
