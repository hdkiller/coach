import { getServerSession } from '../../../utils/session'
import { issuesRepository } from '../../../utils/repositories/issuesRepository'
import { z } from 'zod'

const reactionSchema = z.object({
  emoji: z.string().min(1).max(10)
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  }

  const body = await readBody(event)
  const result = reactionSchema.safeParse(body)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid emoji' })
  }

  const updatedReport = await issuesRepository.toggleIssueReaction(id, session.user.id, result.data.emoji)

  return updatedReport
})
