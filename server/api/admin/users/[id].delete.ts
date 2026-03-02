import { createError, getRouterParam } from 'h3'
import { getServerSession } from '../../../utils/session'
import { scheduleAccountDeletion } from '../../../utils/services/accountDeletionService'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)

  if (!session?.user?.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID required'
    })
  }

  if (userId === session.user.originalUserId || userId === session.user.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Use the regular account deletion flow for your own account'
    })
  }

  return await scheduleAccountDeletion({
    userId,
    actor: {
      type: 'admin',
      id: session.user.originalUserId || session.user.id,
      email: session.user.originalUserEmail || session.user.email
    },
    event
  })
})
