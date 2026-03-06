import { publishChatRealtimeEvent } from './chat-realtime-bus'

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

  return deliveredCount
}

/**
 * Sends a WebSocket message to all active connections for a specific user.
 * This should only be used from within the same process as the WebSocket server.
 */
export async function sendToUser(userId: string, data: any) {
  sendToUserLocal(userId, data)
  await publishChatRealtimeEvent(userId, data)
}
