import { getServerSession } from '../../../../utils/session'
import { prisma } from '../../../../utils/db'
import { ACTIVE_CHAT_TURN_STATUSES } from '../../../../utils/chat/turns'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  const roomId = getRouterParam(event, 'id')

  if (!userId || !roomId) {
    throw createError({ statusCode: 400, message: 'Room ID required' })
  }

  const participant = await prisma.chatParticipant.findUnique({
    where: {
      userId_roomId: {
        userId,
        roomId
      }
    },
    include: {
      room: {
        select: {
          deletedAt: true
        }
      }
    }
  })

  if (!participant || participant.room.deletedAt) {
    throw createError({ statusCode: 404, message: 'Room not found or access denied' })
  }

  const [latestMessage, activeTurn, assistantMessageCount] = await prisma.$transaction([
    prisma.chatMessage.findFirst({
      where: { roomId },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        senderId: true
      }
    }),
    prisma.chatTurn.findFirst({
      where: {
        roomId,
        status: {
          in: ACTIVE_CHAT_TURN_STATUSES
        }
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        status: true,
        updatedAt: true
      }
    }),
    prisma.chatMessage.count({
      where: {
        roomId,
        senderId: 'ai_agent'
      }
    })
  ])

  return {
    latestMessageId: latestMessage?.id || null,
    latestMessageCreatedAt: latestMessage?.createdAt?.toISOString() || null,
    latestMessageUpdatedAt: latestMessage?.updatedAt?.toISOString() || null,
    latestMessageSenderId: latestMessage?.senderId || null,
    activeTurnId: activeTurn?.id || null,
    activeTurnStatus: activeTurn?.status || null,
    activeTurnUpdatedAt: activeTurn?.updatedAt?.toISOString() || null,
    hasAssistantMessage: assistantMessageCount > 0
  }
})
