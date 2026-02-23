import { getInternalApiToken } from './internal-api-token'

// Map to store peer authentication status
export const peerContext = new Map<any, { userId?: string }>()

/**
 * Sends a WebSocket message to all active connections for a specific user.
 * This should only be used from within the same process as the WebSocket server.
 */
export async function sendToUser(userId: string, data: any) {
  const isTriggerWorker =
    process.env.TRIGGER_PROJECT_REF && !process.env.NUXT_PUBLIC_SITE_URL?.includes('localhost')
  const isDevWorker =
    process.env.TRIGGER_PROJECT_REF && process.env.NUXT_PUBLIC_SITE_URL?.includes('localhost')

  // If we are in a Trigger.dev worker, we need to bridge to the main server
  if (isTriggerWorker || isDevWorker) {
    try {
      const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const internalApiToken = getInternalApiToken()

      if (!internalApiToken) {
        console.warn('[WS-State] Skipping internal notification: INTERNAL_API_TOKEN not set')
        return
      }

      // Use native fetch to avoid h3/nuxt dependencies in workers
      await fetch(`${baseUrl}/api/internal/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-token': internalApiToken
        },
        body: JSON.stringify({ userId, data })
      })
    } catch (e) {
      console.error(`[WS-State] Failed to bridge notification to server:`, e)
    }
    return
  }

  const message = JSON.stringify(data)
  for (const [peer, ctx] of peerContext.entries()) {
    if (ctx.userId === userId) {
      try {
        peer.send(message)
      } catch (e) {
        console.error(`Failed to send WS message to user ${userId}:`, e)
      }
    }
  }
}
