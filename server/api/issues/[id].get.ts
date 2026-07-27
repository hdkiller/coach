import { requireAuth } from '../../utils/auth-guard'
import { issuesRepository } from '../../utils/repositories/issuesRepository'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['issue:read'])
  const userId = user.id

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
