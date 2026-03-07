import { defineWebSocketHandler } from 'h3'
import { verifyWsToken } from '../utils/ws-auth'
import { checkQuota } from '../utils/quotas/engine'
import { peerContext } from '../utils/ws-state'
import { chatService } from '../utils/services/chatService'
import { chatTurnService } from '../utils/services/chatTurnService'

export default defineWebSocketHandler({
  open(peer) {
    peer.send(JSON.stringify({ type: 'welcome', message: 'Connected to Coach Watts WebSocket' }))
    peerContext.set(peer, {})
  },

  async message(peer, message) {
    const text = message.text()

    if (text === 'ping') {
      peer.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
      return
    }

    try {
      const data = JSON.parse(text)

      if (data.type === 'authenticate') {
        const userId = verifyWsToken(data.token)
        if (userId) {
          const ctx = peerContext.get(peer) || {}
          ctx.userId = userId
          peerContext.set(peer, ctx)
          peer.send(JSON.stringify({ type: 'authenticated', userId }))
        } else {
          peer.send(
            JSON.stringify({
              type: 'error',
              code: 'INVALID_TOKEN',
              message: 'Invalid authentication token'
            })
          )
        }
        return
      }

      if (data.type === 'chat_message') {
        const ctx = peerContext.get(peer)
        if (!ctx?.userId) {
          peer.send(
            JSON.stringify({
              type: 'error',
              code: 'UNAUTHORIZED',
              message: 'Authentication required for chat'
            })
          )
          return
        }

        const { roomId, content, replyMessage } = data
        if (!roomId || !content) return

        await handleChatMessage(peer, ctx.userId, roomId, content, replyMessage)
      }
    } catch (error) {
      console.error('WebSocket message error:', error)
    }
  },

  close(peer) {
    peerContext.delete(peer)
  },

  error() {
    // WebSocket errors are handled by the peer/client.
  }
})

async function handleChatMessage(
  peer: any,
  userId: string,
  roomId: string,
  content: string,
  replyMessage?: any
) {
  try {
    await checkQuota(userId, 'chat_ws')
    await chatService.validateRoomAccess(userId, roomId)

    const userMessage = await chatService.saveUserMessage({
      userId,
      roomId,
      content,
      role: 'user',
      replyToId: replyMessage?._id || undefined
    })

    peer.send(
      JSON.stringify({
        type: 'chat_message_saved',
        roomId,
        messageId: userMessage.id,
        content: userMessage.content,
        createdAt: userMessage.createdAt
      })
    )

    let turn = await chatTurnService.findLatestTurnForMessage(userMessage.id)

    if (!turn) {
      turn = await chatTurnService.createTurn({
        roomId,
        userId,
        userMessageId: userMessage.id,
        request: {
          messages: await chatTurnService.buildStableRequestMessages(roomId, userMessage.id, 25),
          replyMessage,
          lastMessageId: userMessage.id,
          content
        }
      })

      await prisma.chatMessage.update({
        where: { id: userMessage.id },
        data: {
          turnId: turn.id,
          metadata: {
            ...((userMessage.metadata as any) || {}),
            turnId: turn.id,
            turnStatus: turn.status
          } as any
        }
      })

      await chatTurnService.enqueueTurn(turn.id, userId)
    }

    peer.send(
      JSON.stringify({
        type: 'chat_turn_queued',
        roomId,
        turnId: turn.id,
        status: turn.status
      })
    )
  } catch (error: any) {
    console.error('[WS Chat] Error:', error)
    peer.send(
      JSON.stringify({
        type: 'error',
        roomId,
        code: 'CHAT_ERROR',
        message: error.message || 'An error occurred during chat processing'
      })
    )
  }
}
