import { getServerSession } from '../../../../utils/session'
import { issuesRepository } from '../../../../utils/repositories/issuesRepository'
import { z } from 'zod'
import { createUserNotification } from '../../../../utils/notifications'

const commentSchema = z.object({
  content: z.string().min(1).max(2000)
})

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
  const result = commentSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: result.error.flatten()
    })
  }

  const comment = await issuesRepository.addComment(id, session.user.id, result.data.content, true)

  // Notify user about the new comment
  const report = await issuesRepository.getById(id)

  if (report) {
    await createUserNotification(report.userId, {
      title: 'New Developer Comment',
      message: `A developer commented on your issue: "${report.title}"`,
      icon: 'i-heroicons-chat-bubble-left-right',
      link: `/issues/${id}`
    })
  }

  return comment
})
