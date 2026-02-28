import { getServerSession } from '../../utils/session'
import { expandStoredChatMessages } from '../../utils/chat/history'

defineRouteMeta({
  openAPI: {
    tags: ['Chat'],
    summary: 'List chat messages',
    description: 'Returns the message history for a specific chat room.',
    parameters: [
      {
        name: 'roomId',
        in: 'query',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  role: { type: 'string' },
                  parts: { type: 'array' },
                  metadata: { type: 'object' }
                }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  if (!userId) {
    throw createError({ statusCode: 401, message: 'User ID not found' })
  }

  const { roomId } = getQuery(event) as { roomId: string }

  if (!roomId) {
    throw createError({ statusCode: 400, message: 'Room ID required' })
  }

  // Verify user is in the room and room is not deleted
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

  const messages = await prisma.chatMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      content: true,
      senderId: true,
      createdAt: true,
      files: true,
      metadata: true
    }
  })

  return expandStoredChatMessages(messages)
})
