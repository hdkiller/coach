import { getServerSession } from '../../../utils/session'
import { issuesRepository } from '../../../utils/repositories/issuesRepository'
import { z } from 'zod'

const commentSchema = z.object({
  content: z.string().min(1).max(2000)
})

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

  // Check ownership
  const report = await issuesRepository.getById(id, userId)

  if (!report) {
    throw createError({ statusCode: 404, statusMessage: 'Bug report not found' })
  }

  const body = await readBody(event)
  const result = commentSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input'
    })
  }

  const comment = await issuesRepository.addComment(id, userId, result.data.content, false)

  return comment
})
