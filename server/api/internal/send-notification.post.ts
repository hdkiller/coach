import { getInternalApiToken } from '../../utils/internal-api-token'
import { sendToUser } from '../../utils/ws-state'

/**
 * Internal API to send a real-time WebSocket notification to a user.
 * This is used by Trigger.dev workers to bridge the gap between their isolated
 * process and the main Nuxt server which holds the active WebSocket connections.
 */
export default defineEventHandler(async (event) => {
  const internalToken = getInternalApiToken()
  const incomingToken = getRequestHeader(event, 'x-internal-api-token')

  if (!internalToken || incomingToken !== internalToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const body = await readBody(event)
  const { userId, data } = body

  if (!userId || !data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: userId and data are required'
    })
  }

  try {
    // Send via the memory-resident WebSocket connections
    sendToUser(userId, data)

    return { success: true }
  } catch (err: any) {
    console.error(`[InternalNotification] Error sending to user ${userId}:`, err)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to send notification: ${err.message}`
    })
  }
})
