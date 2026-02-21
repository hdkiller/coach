import { getServerSession } from '../../../utils/session'
import { prisma } from '../../../utils/db'

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
    await prisma.$transaction(async (tx) => {
      await tx.chatMessage.deleteMany({
        where: {
          roomId: message.roomId,
          createdAt: {
            gte: message.createdAt
          }
        }
      })

      await tx.chatRoom.update({
        where: { id: message.roomId },
        data: { lastMessageAt: new Date() }
      })
    })

    return {
      success: true,
      regenerateFromEdit: true
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
