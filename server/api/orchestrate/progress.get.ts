import { defineEventHandler, setHeader } from 'h3'
import { requireAuth } from '../../utils/auth-guard'
import { activeSyncs } from './full-sync.post'

defineRouteMeta({
  openAPI: {
    tags: ['Orchestration'],
    summary: 'Get orchestration progress',
    description: 'Streams Server-Sent Events (SSE) for tracking background sync progress.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'text/event-stream': {
            schema: { type: 'string' }
          }
        }
      },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  // Require the same scope as full-sync.post.ts (which starts the sync this
  // endpoint reports progress for) — workout:write and workout:read are
  // independent OAuth scopes in this codebase, so a client authorized to
  // start a full sync must also be authorized to poll its progress.
  // Use the same user.id key as full-sync.post.ts stores in activeSyncs
  const user = await requireAuth(event, ['workout:write'])
  const userId = user.id

  // Set SSE headers
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')

  // Create a response stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // Function to send data
      const sendData = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      // Get sync state if it exists (keyed by user.id, matching full-sync)
      const syncState = activeSyncs.get(userId)

      if (syncState) {
        // Send current state
        sendData({
          type: 'init',
          states: syncState.states,
          startTime: syncState.startTime
        })

        // Add this connection as a subscriber
        syncState.subscribers.add(sendData)

        // Clean up on close
        event.node.req.on('close', () => {
          syncState.subscribers.delete(sendData)
          controller.close()
        })
      } else {
        // No active sync
        sendData({
          type: 'no_sync',
          message: 'No active sync in progress'
        })
        controller.close()
      }

      // Keep-alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          sendData({ type: 'ping' })
        } catch (error) {
          clearInterval(keepAlive)
        }
      }, 30000)

      // Clean up keep-alive on close
      event.node.req.on('close', () => {
        clearInterval(keepAlive)
      })
    }
  })

  return stream
})
