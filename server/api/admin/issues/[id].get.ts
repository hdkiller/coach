import { getServerSession } from '../../../utils/session'
import { issuesRepository } from '../../../utils/repositories/issuesRepository'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  }

  const report = await issuesRepository.getById(id)

  if (!report) {
    throw createError({ statusCode: 404, statusMessage: 'Bug report not found' })
  }

  return report
})
