import { requireAdmin } from '../../../../../../utils/auth-guard'
import { issuesRepository } from '../../../../../../utils/repositories/issuesRepository'

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const issueId = getRouterParam(event, 'id')
  const commentId = getRouterParam(event, 'commentId')

  if (!issueId || !commentId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing issueId or commentId' })
  }

  const issue = await issuesRepository.getById(issueId, undefined, true)
  if (!issue) {
    throw createError({ statusCode: 404, statusMessage: 'Issue not found' })
  }

  const comment = issue.comments.find((c) => c.id === commentId)
  if (!comment) {
    throw createError({ statusCode: 404, statusMessage: 'Comment not found' })
  }

  const updatedComment = await issuesRepository.acknowledgeComment(
    issueId,
    commentId,
    session.user.id
  )

  if (!updatedComment) {
    throw createError({ statusCode: 404, statusMessage: 'Comment not found' })
  }

  return updatedComment
})
