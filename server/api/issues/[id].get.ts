import { getServerSession } from '../../utils/session'
import { issuesRepository } from '../../utils/repositories/issuesRepository'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const userId = session.user.id

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  }

  const report = await issuesRepository.getById(id, userId)

  if (!report) {
    throw createError({ statusCode: 404, statusMessage: 'Issue not found' })
  }

  return report
})
