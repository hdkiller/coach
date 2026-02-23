import { getServerSession } from '../../../../utils/session'
import { issuesRepository } from '../../../../utils/repositories/issuesRepository'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const issueId = getRouterParam(event, 'id')
  const commentId = getRouterParam(event, 'commentId')
  if (!issueId || !commentId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  }

  const deleted = await issuesRepository.deleteComment(issueId, commentId, {
    userId: session.user.id
  })

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Comment not found' })
  }

  return { success: true }
})
