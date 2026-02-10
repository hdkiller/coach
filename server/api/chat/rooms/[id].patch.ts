import { getServerSession } from '../../../utils/session'

defineRouteMeta({
  openAPI: {
    tags: ['Chat'],
    summary: 'Rename a chat room',
    description: 'Updates the name of a chat room for the authenticated user.',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            },
            required: ['name']
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                room: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },
      400: { description: 'Bad Request' },
      401: { description: 'Unauthorized' },
      404: { description: 'Not Found' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  const roomId = getRouterParam(event, 'id')
  const { name } = await readBody(event)

  if (!roomId) {
    throw createError({ statusCode: 400, message: 'Room ID is required' })
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw createError({ statusCode: 400, message: 'Valid name is required' })
  }

  // Check if the user is a participant in the room
  const participant = await prisma.chatParticipant.findUnique({
    where: {
      userId_roomId: {
        userId,
        roomId
      }
    }
  })

  if (!participant) {
    throw createError({ statusCode: 404, message: 'Room not found or access denied' })
  }

  // Update the room name
  const updatedRoom = await prisma.chatRoom.update({
    where: { id: roomId },
    data: { name: name.trim() }
  })

  return {
    success: true,
    room: {
      id: updatedRoom.id,
      name: updatedRoom.name
    }
  }
})
