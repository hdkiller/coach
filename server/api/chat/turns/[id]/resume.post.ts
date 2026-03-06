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

  if (turn.status !== CHAT_TURN_STATUS.INTERRUPTED) {
    throw createError({ statusCode: 400, message: 'Only interrupted turns can be resumed.' })
  }

  await chatTurnService.updateStatus(turn.id, CHAT_TURN_STATUS.QUEUED, {
    finishedAt: null,
    failureReason: null
  })

  if (turn.assistantMessageId) {
    const assistantMessage = await prisma.chatMessage.findUnique({
      where: { id: turn.assistantMessageId }
    })
    if (assistantMessage) {
      await prisma.chatMessage.update({
        where: { id: assistantMessage.id },
        data: {
          content: ' ',
          metadata: {
            ...((assistantMessage.metadata as any) || {}),
            isDraft: true,
            turnStatus: CHAT_TURN_STATUS.QUEUED,
            interrupted: false,
            failureReason: null
          } as any
        }
      })
    }
  }

  await chatTurnService.enqueueTurn(turn.id, userId)

  return {
    success: true,
    turnId: turn.id,
    status: CHAT_TURN_STATUS.QUEUED
  }
})
