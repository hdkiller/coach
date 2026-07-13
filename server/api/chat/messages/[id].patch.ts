import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'
import { ACTIVE_CHAT_TURN_STATUSES } from '../../../utils/chat/turns'
import { chatTurnService } from '../../../utils/services/chatTurnService'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  if (!userId) {
    throw createError({ statusCode: 401, message: 'User ID not found' })
  }

  const messageId = event.context.params?.id
  if (!messageId) {
    throw createError({ statusCode: 400, message: 'Message ID required' })
  }

  const body = await readBody(event)
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  const roomId = typeof body?.roomId === 'string' ? body.roomId : undefined
  const regenerateFromEdit = body?.regenerateFromEdit === true

  if (!content) {
    throw createError({ statusCode: 400, message: 'Message content is required' })
  }

  if (content.length > 10000) {
    throw createError({ statusCode: 400, message: 'Message is too long' })
  }

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      roomId: true,
      senderId: true,
      content: true,
      metadata: true,
      createdAt: true
    }
  })

  if (!message) {
    throw createError({ statusCode: 404, message: 'Message not found' })
  }

  if (roomId && message.roomId !== roomId) {
    throw createError({ statusCode: 400, message: 'Message does not belong to this room' })
  }

  if (message.senderId !== userId) {
    throw createError({ statusCode: 403, message: 'You can only edit your own messages' })
  }

  const participant = await prisma.chatParticipant.findUnique({
    where: {
      userId_roomId: {
        userId,
        roomId: message.roomId
      }
    },
    include: {
      room: {
        select: {
          id: true,
          deletedAt: true,
          createdAt: true
        }
      }
    }
  })

  if (!participant || participant.room.deletedAt) {
    throw createError({ statusCode: 404, message: 'Room not found or access denied' })
  }

  const MIGRATION_CUTOFF = new Date('2026-01-22T00:00:00Z')
  if (new Date(participant.room.createdAt) < MIGRATION_CUTOFF) {
    throw createError({
      statusCode: 403,
      message: 'This chat is read-only. Please start a new chat.'
    })
  }

  if (regenerateFromEdit) {
    const metadata = (message.metadata as Record<string, any> | null) || {}
    const nextMetadata: Record<string, any> = {
      ...metadata,
      editedAt: new Date().toISOString(),
      editCount: Number(metadata.editCount || 0) + 1
    }

    if (!metadata.originalContent) {
      nextMetadata.originalContent = message.content
    }

    await prisma.$transaction(async (tx) => {
      const activeDownstreamTurn = await tx.chatTurn.findFirst({
        where: {
          roomId: message.roomId,
          createdAt: {
            gt: message.createdAt
          },
          status: {
            in: ACTIVE_CHAT_TURN_STATUSES
          }
        },
        select: {
          id: true
        }
      })

      if (activeDownstreamTurn) {
        throw createError({
          statusCode: 409,
          message: 'Cannot regenerate while a downstream response is still running.'
        })
      }

      await tx.chatTurn.deleteMany({
        where: {
          roomId: message.roomId,
          createdAt: {
            gt: message.createdAt
          }
        }
      })

      await tx.chatMessage.deleteMany({
        where: {
          roomId: message.roomId,
          createdAt: {
            gt: message.createdAt
          }
        }
      })

      await tx.chatMessage.update({
        where: { id: message.id },
        data: {
          content,
          metadata: nextMetadata,
          turnId: null
        }
      })

      const latestRemainingMessage = await tx.chatMessage.findFirst({
        where: {
          roomId: message.roomId
        },
        orderBy: [{ createdAt: 'desc' }]
      })

      await tx.chatRoom.update({
        where: { id: message.roomId },
        data: {
          lastMessageAt: latestRemainingMessage?.createdAt || participant.room.createdAt
        }
      })
    })

    const turn = await chatTurnService.createTurn({
      roomId: message.roomId,
      userId,
      userMessageId: message.id,
      request: {
        messages: await chatTurnService.buildStableRequestMessages(message.roomId, message.id, 25),
        lastMessageId: message.id,
        content,
        coachingContext: {
          actorUserId: (session.user as any)?.originalUserId || userId,
          isCoaching: !!(session.user as any)?.isCoaching
        }
      }
    })

    await prisma.chatMessage.update({
      where: { id: message.id },
      data: {
        turnId: turn.id,
        metadata: {
          ...nextMetadata,
          turnId: turn.id,
          turnStatus: turn.status
        } as any
      }
    })

    await chatTurnService.enqueueTurn(turn.id, userId)

    return {
      success: true,
      regenerateFromEdit: true,
      turnId: turn.id,
      messageId: message.id
    }
  }

  const metadata = (message.metadata as Record<string, any> | null) || {}
  const nextMetadata: Record<string, any> = {
    ...metadata,
    editedAt: new Date().toISOString(),
    editCount: Number(metadata.editCount || 0) + 1
  }

  if (!metadata.originalContent) {
    nextMetadata.originalContent = message.content
  }

  const updated = await prisma.chatMessage.update({
    where: { id: message.id },
    data: {
      content,
      metadata: nextMetadata
    },
    select: {
      id: true,
      content: true,
      metadata: true,
      updatedAt: true
    }
  })

  return {
    success: true,
    message: updated
  }
})
