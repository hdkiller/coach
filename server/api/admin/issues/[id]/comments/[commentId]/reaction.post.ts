import { getServerSession } from '../../../../../../utils/session'
import { issuesRepository } from '../../../../../../utils/repositories/issuesRepository'
import { z } from 'zod'

const reactionSchema = z.object({
  emoji: z.string().min(1).max(10)
})

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

  const body = await readBody(event)
  const result = reactionSchema.safeParse(body)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid emoji' })
  }

  const updatedComment = await issuesRepository.toggleReaction(commentId, session.user.id, result.data.emoji)

  return updatedComment
})
