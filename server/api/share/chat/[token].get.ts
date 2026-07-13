import { buildSharedChatMessages } from '../../../utils/chat/share-sanitize'

defineRouteMeta({
  openAPI: {
    tags: ['Public'],
    summary: 'Get public chat',
    description: 'Returns messages of a publicly shared chat room via token.',
    inputSchema: [
      {
        name: 'token',
        in: 'path',
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
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string', nullable: true },
                messages: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      role: { type: 'string' },
                      content: { type: 'string' },
                      createdAt: { type: 'string', format: 'date-time' }
                    }
                  }
                },
                user: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', nullable: true },
                    image: { type: 'string', nullable: true }
                  }
                }
              }
            }
          }
        }
      },
      404: { description: 'Chat not found or link invalid' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Share token is required'
    })
  }

  // Find the share token
  const shareToken = await prisma.shareToken.findUnique({
    where: { token }
  })

  if (!shareToken || shareToken.resourceType !== 'CHAT_ROOM') {
    throw createError({
      statusCode: 404,
      message: 'Chat not found or link is invalid'
    })
  }

  // Check for expiration
  if (shareToken.expiresAt && new Date() > new Date(shareToken.expiresAt)) {
    throw createError({
      statusCode: 404,
      message: 'Share link has expired'
    })
  }

  const room = await prisma.chatRoom.findUnique({
    where: {
      id: shareToken.resourceId,
      deletedAt: null
    },
    include: {
      messages: {
        orderBy: {
          createdAt: 'asc'
        },
        select: {
          id: true,
          content: true,
          senderId: true,
          createdAt: true,
          metadata: true,
          files: true,
          turn: {
            select: {
              id: true,
              status: true,
              failureReason: true,
              startedAt: true,
              finishedAt: true,
              metadata: true
            }
          }
        }
      },
      users: {
        include: {
          user: {
            select: {
              name: true,
              image: true
            }
          }
        }
      }
    }
  })

  if (!room) {
    throw createError({
      statusCode: 404,
      message: 'Chat room not found'
    })
  }

  // The "user" sharing this is the one who created the share token
  const sharingUser = await prisma.user.findUnique({
    where: { id: shareToken.userId },
    select: { name: true, image: true }
  })

  return {
    id: room.id,
    name: room.name,
    createdAt: room.createdAt,
    messages: buildSharedChatMessages(room.messages),
    user: sharingUser
  }
})
