import { z } from 'zod'
import { requireAuth } from '../../utils/auth-guard'
import { markAllNotificationsAsRead, markNotificationAsRead } from '../../utils/notifications'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['profile:write'])
  const userId = user.id

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
