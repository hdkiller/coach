import { publishRealtimeEvent } from './realtime-bus'
import { logRealtimeEvent } from './realtime-logger'

// Map to store peer authentication status
export const peerContext = new Map<any, { userId?: string }>()

export function sendToUserLocal(userId: string, data: any) {
  const message = JSON.stringify(data)
  let deliveredCount = 0

  for (const [peer, ctx] of peerContext.entries()) {
    if (ctx.userId === userId) {
      try {
        peer.send(message)
        deliveredCount += 1
      } catch (e) {
        console.error(`Failed to send WS message to user ${userId}:`, e)
      }
    }
  }

  logRealtimeEvent(data?.channel || 'ws', 'local_deliver', {
    userId,
    type: data?.type,
    deliveredCount,
    reason: data?.event?.reason,
    entityType: data?.event?.entityType,
    entityId: data?.event?.entityId,
    runId: data?.runId
  })

  return deliveredCount
}

/**
 * Sends a WebSocket message to all active connections for a specific user.
 * This should only be used from within the same process as the WebSocket server.
 */
export async function sendToUser(userId: string, data: any) {
  sendToUserLocal(userId, data)
  await publishRealtimeEvent(userId, data)
}
