import { getServerSession } from '../../../../../utils/session'
import { issuesRepository } from '../../../../../utils/repositories/issuesRepository'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const issueId = getRouterParam(event, 'id')
  const commentId = getRouterParam(event, 'commentId')

  if (!issueId || !commentId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing issueId or commentId' })
  }

  // Verify the comment exists and belongs to the issue
  const issue = await issuesRepository.getById(issueId)
  if (!issue) {
    throw createError({ statusCode: 404, statusMessage: 'Issue not found' })
  }

  const comment = issue.comments.find(c => c.id === commentId)
  if (!comment) {
    // If user is admin, they might see NOTES which are filtered out in getById for regular users.
    // However, issuesRepository.getById filters comments if userId is provided.
    // Here we are inside an API, so we should check if the user is authorized.
    // For now, if getById didn't return it, it might be a NOTE or not exist.
    throw createError({ statusCode: 404, statusMessage: 'Comment not found' })
  }

  const updatedComment = await issuesRepository.acknowledgeComment(commentId, session.user.id)

  return updatedComment
})
