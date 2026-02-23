import { getServerSession } from '../../../../utils/session'
import { issuesRepository } from '../../../../utils/repositories/issuesRepository'
import { z } from 'zod'

const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000)
})

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

  const body = await readBody(event)
  const result = updateCommentSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: result.error.flatten()
    })
  }

  const updated = await issuesRepository.updateComment(issueId, commentId, result.data.content, {
    userId: session.user.id
  })

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Comment not found' })
  }

  return updated
})
