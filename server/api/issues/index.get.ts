import { getServerSession } from '../../utils/session'
import { issuesRepository } from '../../utils/repositories/issuesRepository'
import { prisma } from '../../utils/db'
import type { BugStatus } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const userId = session.user.id

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 20
  const search = query.search as string | undefined
  const status = query.status as BugStatus | undefined

  const [listResult, statusCounts] = await Promise.all([
    issuesRepository.list({ userId, search, status }, page, limit),
    prisma.bugReport.groupBy({
      by: ['status'],
      where: { userId },
      _count: true
    })
  ])

  // Process stats
  const stats = {
    total: 0,
    active: 0,
    resolved: 0
  }

  statusCounts.forEach((c) => {
    const count = c._count
    stats.total += count
    if (['OPEN', 'IN_PROGRESS', 'NEED_MORE_INFO'].includes(c.status)) {
      stats.active += count
    } else if (c.status === 'RESOLVED') {
      stats.resolved += count
    }
  })

  return {
    ...listResult,
    stats
  }
})
