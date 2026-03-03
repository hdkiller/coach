import { getServerSession } from '../../../utils/session'
import { issuesRepository } from '../../../utils/repositories/issuesRepository'
import { getZodErrorMessage, issueCommentSchema } from '../../../utils/issues/commentValidation'

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
  const result = issueCommentSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: getZodErrorMessage(result.error),
      data: result.error.flatten()
    })
  }

  const comment = await issuesRepository.addComment(id, userId, result.data.content, false)

  return comment
})
