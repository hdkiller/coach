import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import { requireAuth } from '../../utils/auth-guard'
import { prisma } from '../../utils/db'
import { checkQuota } from '../../utils/quotas/engine'
import { chatService } from '../../utils/services/chatService'
import { chatTurnService } from '../../utils/services/chatTurnService'
import { getServerSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['chat:write'])
  const session = await getServerSession(event)
  const userId = user.id

  try {
    await checkQuota(userId, 'chat')
  } catch (error: any) {
    if (error.statusCode === 429) {
      throw createError({
        statusCode: 429,
        message: error.message || 'Chat quota exceeded. Please wait or upgrade your plan.'
      })
    }
    throw error
  }

  const body = await readBody(event)
  const { roomId, messages, files, replyMessage } = body
  const clientMessages = Array.isArray(messages) ? messages : []
  const truncatedMessages = clientMessages.slice(-25)

  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { createdAt: true }
  })

  const MIGRATION_CUTOFF = new Date('2026-01-22T00:00:00Z')
  if (room && new Date(room.createdAt) < MIGRATION_CUTOFF) {
    throw createError({
      statusCode: 403,
      message: 'This chat is read-only. Please start a new chat.'
    })
  }

  const lastMessage = truncatedMessages?.[truncatedMessages.length - 1]
  const messageParts = Array.isArray(lastMessage?.parts)
    ? lastMessage.parts
    : typeof lastMessage?.content === 'string'
      ? [{ type: 'text', text: lastMessage.content }]
      : Array.isArray(lastMessage?.content)
        ? lastMessage.content
        : []

  const attachedFiles = [
    ...messageParts
      .filter((part: any) => part?.type === 'file' && part?.url && part?.mediaType)
      .map((part: any) => ({
        url: part.url,
        mediaType: part.mediaType,
        filename: part.filename
      })),
    ...(Array.isArray(files) ? files : [])
  ].filter(
    (file: any, index: number, array: any[]) =>
      file?.url &&
      file?.mediaType &&
      index === array.findIndex((candidate) => candidate?.url === file.url)
  )

  const content =
    typeof lastMessage?.content === 'string'
      ? lastMessage.content
      : messageParts
          .filter((p: any) => p?.type === 'text' && typeof p.text === 'string')
          .map((p: any) => p.text)
          .join('')

  const hasToolApprovalResponse = truncatedMessages.some((msg: any) => {
    if (msg.role !== 'tool') return false
    const parts = Array.isArray(msg.parts)
      ? msg.parts
      : Array.isArray(msg.content)
        ? msg.content
        : []
    return parts.some((part: any) => part?.type === 'tool-approval-response')
  })
  const isLastToolApprovalResponse =
    lastMessage?.role === 'tool' &&
    messageParts.some((part: any) => part?.type === 'tool-approval-response')

  const isAssistantApprovalContinuation =
    lastMessage?.role === 'assistant' &&
    Array.isArray(lastMessage?.parts) &&
    lastMessage.parts.some(
      (part: any) => part?.type?.startsWith('tool-') && part?.state === 'approval-responded'
    )

  const isReplayToolMessage = lastMessage?.role === 'tool' && !isLastToolApprovalResponse
  const isToolContinuationTurn =
    isLastToolApprovalResponse || hasToolApprovalResponse || isAssistantApprovalContinuation

  // The backend already executes tool steps within the active chat turn.
  // If the SDK replays a persisted tool-result message back to this endpoint,
  // creating a new turn here causes self-triggered continuation loops.
  if (isReplayToolMessage) {
    const stream = createUIMessageStream({
      execute: () => {}
    })

    return createUIMessageStreamResponse({ stream })
  }

  if (!roomId || (!content && attachedFiles.length === 0 && !isToolContinuationTurn)) {
    throw createError({ statusCode: 400, message: 'Room ID and content required' })
  }

  await chatService.validateRoomAccess(userId, roomId)

  const incomingMessageId = lastMessage?.id
  const existingMessage = incomingMessageId
    ? await prisma.chatMessage.findUnique({
        where: { id: incomingMessageId },
        select: {
          id: true,
          roomId: true,
          senderId: true,
          metadata: true
        }
      })
    : null

  if (existingMessage) {
    const expectedSenderId = lastMessage?.role === 'tool' ? 'system_tool' : userId

    if (existingMessage.roomId !== roomId || existingMessage.senderId !== expectedSenderId) {
      throw createError({
        statusCode: 409,
        message: 'Incoming message ID does not match this room context.'
      })
    }
  }

  const shouldPersistIncomingMessage =
    !!lastMessage &&
    (lastMessage.role === 'user' || (lastMessage.role === 'tool' && isLastToolApprovalResponse))
  let persistedMessage = existingMessage

  if (shouldPersistIncomingMessage && !existingMessage) {
    const metadata: any = {}
    if (lastMessage.role === 'tool') {
      // Prefer parts over content for tool messages — the client sends tool-approval-response
      // in parts (not content), and expandStoredChatMessage reads from metadata.toolResponse.
      if (Array.isArray(lastMessage.parts) && lastMessage.parts.length > 0) {
        metadata.toolResponse = lastMessage.parts
      } else if (Array.isArray(lastMessage.content)) {
        metadata.toolResponse = lastMessage.content
      }
    }

    persistedMessage = await chatService.saveUserMessage({
      userId,
      roomId,
      content: typeof content === 'string' ? content : '',
      role: lastMessage.role,
      metadata,
      id: incomingMessageId || undefined,
      replyToId: replyMessage?._id || undefined,
      files: attachedFiles.length > 0 ? attachedFiles : undefined
    })
  }

  const triggerMessageId =
    persistedMessage?.id ||
    [...truncatedMessages]
      .reverse()
      .find((msg: any) => ['user', 'tool'].includes(msg?.role) && typeof msg?.id === 'string')?.id

  if (!triggerMessageId) {
    throw createError({ statusCode: 400, message: 'Could not identify the triggering message.' })
  }

  let turn = await chatTurnService.findLatestTurnForMessage(triggerMessageId)

  if (!turn) {
    turn = await chatTurnService.createTurn({
      roomId,
      userId,
      userMessageId: triggerMessageId,
      request: {
        messages: await chatTurnService.buildStableRequestMessages(roomId, triggerMessageId, 25),
        files: attachedFiles,
        replyMessage,
        lastMessageId: triggerMessageId,
        content: typeof content === 'string' ? content : '',
        coachingContext: {
          actorUserId: (session?.user as any)?.originalUserId || userId,
          isCoaching: !!(session?.user as any)?.isCoaching
        }
      }
    })

    await prisma.chatMessage
      .updateMany({
        where: {
          id: triggerMessageId
        },
        data: {
          turnId: turn.id,
          metadata: {
            ...(((persistedMessage?.metadata as any) || {}) ?? {}),
            turnId: turn.id,
            turnStatus: turn.status
          } as any
        }
      })
      .catch(() => null)

    await chatTurnService.enqueueTurn(turn.id, userId)
  }

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({
        type: 'data-chat-turn',
        data: {
          turnId: turn.id,
          status: turn.status
        },
        transient: true
      } as any)
    }
  })

  return createUIMessageStreamResponse({ stream })
})
