import { getServerSession } from '../../utils/session'

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

  // Return messages in AI SDK format, expanding multi-step turns
  const expandedMessages: any[] = []

  for (const msg of messages) {
    const metadata = (msg.metadata as any) || {}
    const role =
      msg.senderId === 'ai_agent' ? 'assistant' : msg.senderId === 'system_tool' ? 'tool' : 'user'

    // Case 1: Standard User or Tool message
    if (role !== 'assistant') {
      const parts: any[] = []
      if (msg.content) parts.push({ type: 'text', text: msg.content })
      if (Array.isArray(msg.files)) {
        msg.files.forEach((file: any) => {
          if (!file?.url || !file?.mediaType) return
          parts.push({
            type: 'file',
            url: file.url,
            mediaType: file.mediaType,
            filename: file.filename
          })
        })
      }

      // Add tool responses if this is a tool message
      if (metadata.toolResponse && Array.isArray(metadata.toolResponse)) {
        metadata.toolResponse.forEach((part: any) => parts.push(part))
      }

      expandedMessages.push({
        id: msg.id,
        role,
        parts: parts.length > 0 ? parts : undefined,
        content: msg.content || '',
        createdAt: msg.createdAt,
        metadata: {
          ...metadata,
          createdAt: msg.createdAt,
          senderId: msg.senderId
        }
      })
      continue
    }

    // Case 2: Assistant message (potentially multi-step)
    const hasToolCalls =
      metadata.toolCalls && Array.isArray(metadata.toolCalls) && metadata.toolCalls.length > 0
    const hasApprovals =
      metadata.toolApprovals &&
      Array.isArray(metadata.toolApprovals) &&
      metadata.toolApprovals.length > 0

    if (!hasToolCalls && !hasApprovals) {
      // Simple text assistant message
      expandedMessages.push({
        id: msg.id,
        role: 'assistant',
        parts: [{ type: 'text', text: msg.content || ' ' }],
        content: msg.content || '',
        createdAt: msg.createdAt,
        metadata: {
          ...metadata,
          createdAt: msg.createdAt,
          senderId: msg.senderId
        }
      })
      continue
    }

    // Expand collapsed multi-step assistant turn:

    const parts: any[] = []

    if (hasApprovals) {
      metadata.toolApprovals.forEach((approval: any) => {
        parts.push({
          type: `tool-${approval.name}`,

          toolCallId: approval.toolCallId,

          state: 'approval-requested',

          input: approval.args || {},

          approval: {
            id: approval.approvalId || approval.toolCallId
          }
        })
      })
    }

    if (hasToolCalls) {
      metadata.toolCalls.forEach((tc: any, index: number) => {
        parts.push({
          type: `tool-${tc.name}`,

          toolCallId: tc.toolCallId || `call-${msg.id}-${index}`,

          state: 'output-available',

          input: tc.args || {},

          output: tc.response
        })
      })
    }

    // Add text part if content exists

    if (msg.content) {
      parts.push({
        type: 'text',

        text: msg.content
      })
    }

    // Ensure at least one part for assistant

    if (parts.length === 0) {
      parts.push({ type: 'text', text: ' ' })
    }

    expandedMessages.push({
      id: msg.id,

      role: 'assistant',

      parts,

      content: msg.content || ' ',
      createdAt: msg.createdAt,

      metadata: {
        ...metadata,

        createdAt: msg.createdAt,

        senderId: msg.senderId
      }
    })
  }

  return expandedMessages
})
