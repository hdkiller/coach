import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import { CHAT_TURN_STATUS } from '../../../../utils/chat/turns'
import { chatService } from '../../../../utils/services/chatService'
import { chatTurnService } from '../../../../utils/services/chatTurnService'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  const turnId = getRouterParam(event, 'id')

  if (!userId || !turnId) {
    throw createError({ statusCode: 400, message: 'Turn ID required.' })
  }

  const turn = await prisma.chatTurn.findUnique({
    where: { id: turnId }
  })

  if (!turn || turn.userId !== userId) {
    throw createError({ statusCode: 404, message: 'Turn not found.' })
  }

  await chatService.validateRoomAccess(userId, turn.roomId)

  const originalMessage = await prisma.chatMessage.findUnique({
    where: { id: turn.userMessageId }
  })

  if (!originalMessage) {
    throw createError({ statusCode: 404, message: 'Original user message not found.' })
  }

  const clonedMessage = await prisma.chatMessage.create({
    data: {
      content: originalMessage.content,
      roomId: originalMessage.roomId,
      senderId: originalMessage.senderId,
      files: originalMessage.files as any,
      replyToId: originalMessage.replyToId,
      seen: { [userId]: new Date() },
      metadata: {
        ...((originalMessage.metadata as any) || {}),
        retriedFromMessageId: originalMessage.id,
        turnStatus: CHAT_TURN_STATUS.QUEUED
      } as any
    }
  })

  await prisma.chatRoom.update({
    where: { id: originalMessage.roomId },
    data: { lastMessageAt: new Date() }
  })

  const requestSnapshot = chatTurnService.getRequestSnapshot(turn)
  const rebuiltMessages = await chatTurnService.buildStableRequestMessages(
    turn.roomId,
    clonedMessage.id,
    25
  )
  const retryTurn = await chatTurnService.createTurn({
    roomId: turn.roomId,
    userId,
    userMessageId: clonedMessage.id,
    lineageId: turn.lineageId,
    retryOfTurnId: turn.id,
    request: {
      ...requestSnapshot,
      messages: rebuiltMessages,
      lastMessageId: clonedMessage.id
    }
  })

  await prisma.chatMessage.update({
    where: { id: clonedMessage.id },
    data: {
      turnId: retryTurn.id,
      metadata: {
        ...((clonedMessage.metadata as any) || {}),
        turnId: retryTurn.id,
        turnStatus: CHAT_TURN_STATUS.QUEUED
      } as any
    }
  })

  await chatTurnService.enqueueTurn(retryTurn.id, userId)

  return {
    success: true,
    turnId: retryTurn.id,
    status: CHAT_TURN_STATUS.QUEUED
  }
})
