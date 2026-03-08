import { getServerSession } from '../../utils/session'
import { markAllNotificationsAsRead, markNotificationAsRead } from '../../utils/notifications'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const userId = session.user.id

  const body = await readBody(event)
  const { id, all } = body

  if (all) {
    await markAllNotificationsAsRead(userId)
    return { success: true }
  }

  if (id) {
    const result = await markNotificationAsRead(userId, id)
    if (result.count === 0) {
      throw createError({
        statusCode: 404,
        message: 'Notification not found'
      })
    }
    return { success: true }
  }

  throw createError({
    statusCode: 400,
    message: 'Either id or all parameter must be provided'
  })
})
