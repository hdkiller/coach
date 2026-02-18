import { getServerSession } from '../../../utils/session'
import { issuesRepository } from '../../../utils/repositories/issuesRepository'
import type { BugStatus } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const status = query.status as BugStatus | undefined
  const search = query.search as string | undefined

  const { total, items, totalPages } = await issuesRepository.list({ status, search }, page, limit)

  return {
    count: total,
    reports: items,
    page,
    limit,
    totalPages
  }
})
