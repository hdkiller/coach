import { getServerSession } from '../../../../utils/session'
import { issuesRepository } from '../../../../utils/repositories/issuesRepository'
import { createUserNotification } from '../../../../utils/notifications'
import {
  getZodErrorMessage,
  issueAdminCommentSchema
} from '../../../../utils/issues/commentValidation'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  }

  const body = await readBody(event)
  const result = issueAdminCommentSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: getZodErrorMessage(result.error),
      data: result.error.flatten()
    })
  }

  const comment = await issuesRepository.addComment(
    id,
    session.user.id,
    result.data.content,
    true,
    result.data.type
  )

  // Notify user about the new comment ONLY if it's a MESSAGE
  if (result.data.type === 'MESSAGE') {
    const report = await issuesRepository.getById(id)

    if (report) {
      await createUserNotification(report.userId, {
        title: 'New Developer Comment',
        message: `A developer commented on your issue: "${report.title}"`,
        icon: 'i-heroicons-chat-bubble-left-right',
        link: `/issues/${id}`
      })
    }
  }

  return comment
})
