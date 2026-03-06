import type { Prisma } from '@prisma/client'
import { prisma } from '../db'
import {
  CHAT_TURN_EVENT_TYPE,
  CHAT_TURN_HEARTBEAT_TIMEOUT_MS,
  CHAT_TURN_STATUS,
  type ChatTurnStatus,
  isActiveChatTurnStatus,
  shouldResumeTurn
} from '../chat/turns'

type PersistedRequestSnapshot = {
  messages: any[]
  files?: any[]
  replyMessage?: any
  lastMessageId?: string
  content?: string
}

class ChatTurnService {
  getRequestSnapshot(turn: { metadata?: Prisma.JsonValue | null }): PersistedRequestSnapshot {
    const metadata = (turn.metadata as any) || {}
    return {
      messages: Array.isArray(metadata.request?.messages) ? metadata.request.messages : [],
      files: Array.isArray(metadata.request?.files) ? metadata.request.files : [],
      replyMessage: metadata.request?.replyMessage,
      lastMessageId:
        typeof metadata.request?.lastMessageId === 'string'
          ? metadata.request.lastMessageId
          : undefined,
      content: typeof metadata.request?.content === 'string' ? metadata.request.content : undefined
    }
  }

  async createTurn(params: {
    roomId: string
    userId: string
    userMessageId: string
    request: PersistedRequestSnapshot
    lineageId?: string
    retryOfTurnId?: string
  }) {
    return await prisma.$transaction(async (tx) => {
      const turn = await tx.chatTurn.create({
        data: {
          roomId: params.roomId,
          userId: params.userId,
          userMessageId: params.userMessageId,
          status: CHAT_TURN_STATUS.QUEUED,
          lineageId: params.lineageId || 'pending',
          retryOfTurnId: params.retryOfTurnId,
          startedAt: null,
          finishedAt: null,
          lastHeartbeatAt: new Date(),
          metadata: {
            request: params.request
          } as any
        }
      })

      const lineageId = params.lineageId || turn.id

      await tx.chatTurn.update({
        where: { id: turn.id },
        data: { lineageId }
      })

      return {
        ...turn,
        lineageId
      }
    })
  }

  async enqueueTurn(turnId: string, userId: string) {
    const runId = `app:${userId}:${turnId}:${Date.now()}`

    const turn = await prisma.chatTurn.update({
      where: { id: turnId },
      data: {
        runId,
        status: CHAT_TURN_STATUS.QUEUED,
        lastHeartbeatAt: new Date()
      }
    })

    return {
      id: runId,
      turnId: turn.id,
      status: turn.status,
      kind: 'in_process'
    }
  }

  async claimNextQueuedTurn(workerId: string) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = await prisma.chatTurn.findFirst({
        where: {
          status: CHAT_TURN_STATUS.QUEUED
        },
        orderBy: [{ createdAt: 'asc' }]
      })

      if (!candidate) {
        return null
      }

      const claimRunId = `app-worker:${workerId}:${candidate.id}:${Date.now()}`
      const claimed = await prisma.chatTurn.updateMany({
        where: {
          id: candidate.id,
          status: CHAT_TURN_STATUS.QUEUED
        },
        data: {
          status: CHAT_TURN_STATUS.RECEIVED,
          runId: claimRunId,
          lastHeartbeatAt: new Date()
        }
      })

      if (claimed.count > 0) {
        return await prisma.chatTurn.findUnique({
          where: { id: candidate.id }
        })
      }
    }

    return null
  }

  async updateStatus(
    turnId: string,
    status: ChatTurnStatus,
    data: Partial<{
      startedAt: Date | null
      finishedAt: Date | null
      failureReason: string | null
      assistantMessageId: string | null
      providerRequestId: string | null
      metadata: Prisma.InputJsonValue
    }> = {}
  ) {
    return await prisma.chatTurn.update({
      where: { id: turnId },
      data: {
        status,
        lastHeartbeatAt: new Date(),
        ...(data.startedAt !== undefined ? { startedAt: data.startedAt } : {}),
        ...(data.finishedAt !== undefined ? { finishedAt: data.finishedAt } : {}),
        ...(data.failureReason !== undefined ? { failureReason: data.failureReason } : {}),
        ...(data.assistantMessageId !== undefined
          ? { assistantMessageId: data.assistantMessageId }
          : {}),
        ...(data.providerRequestId !== undefined
          ? { providerRequestId: data.providerRequestId }
          : {}),
        ...(data.metadata !== undefined ? { metadata: data.metadata } : {})
      }
    })
  }

  async heartbeat(turnId: string, status?: ChatTurnStatus) {
    return await prisma.chatTurn.update({
      where: { id: turnId },
      data: {
        lastHeartbeatAt: new Date(),
        ...(status ? { status } : {})
      }
    })
  }

  async recordEvent(turnId: string, type: string, data?: Prisma.InputJsonValue) {
    return await prisma.chatTurnEvent.create({
      data: {
        turnId,
        type,
        ...(data !== undefined ? { data } : {})
      }
    })
  }

  async createAssistantDraft(params: {
    turnId: string
    roomId: string
    status: ChatTurnStatus
    existingMessageId?: string | null
  }) {
    if (params.existingMessageId) {
      return await prisma.chatMessage.update({
        where: { id: params.existingMessageId },
        data: {
          content: ' ',
          metadata: {
            isDraft: true,
            turnStatus: params.status
          } as any,
          turnId: params.turnId
        }
      })
    }

    const message = await prisma.chatMessage.create({
      data: {
        content: ' ',
        roomId: params.roomId,
        senderId: 'ai_agent',
        seen: {},
        turnId: params.turnId,
        metadata: {
          isDraft: true,
          turnStatus: params.status
        } as any
      }
    })

    await prisma.chatRoom.update({
      where: { id: params.roomId },
      data: { lastMessageAt: new Date() }
    })

    await prisma.chatTurn.update({
      where: { id: params.turnId },
      data: { assistantMessageId: message.id }
    })

    return message
  }

  async updateAssistantDraft(params: {
    messageId: string
    content: string
    metadata?: Prisma.InputJsonValue
  }) {
    return await prisma.chatMessage.update({
      where: { id: params.messageId },
      data: {
        content: params.content || ' ',
        ...(params.metadata !== undefined ? { metadata: params.metadata } : {})
      }
    })
  }

  async upsertToolResultMessage(params: { turnId: string; roomId: string; toolResponses: any[] }) {
    const existing = await prisma.chatMessage.findFirst({
      where: {
        turnId: params.turnId,
        senderId: 'system_tool'
      },
      orderBy: { createdAt: 'asc' }
    })

    if (existing) {
      return await prisma.chatMessage.update({
        where: { id: existing.id },
        data: {
          content: '',
          metadata: {
            ...((existing.metadata as any) || {}),
            toolResponse: params.toolResponses
          } as any
        }
      })
    }

    return await prisma.chatMessage.create({
      data: {
        content: '',
        roomId: params.roomId,
        senderId: 'system_tool',
        seen: {},
        turnId: params.turnId,
        metadata: {
          toolResponse: params.toolResponses
        } as any
      }
    })
  }

  async startLlmUsage(turnId: string, userId: string, promptPreview: string) {
    return await prisma.llmUsage.create({
      data: {
        userId,
        turnId,
        provider: 'gemini',
        model: 'pending',
        operation: 'chat_turn_start',
        entityType: 'ChatTurn',
        entityId: turnId,
        success: false,
        errorType: 'IN_PROGRESS',
        errorMessage: 'Chat turn execution started.',
        promptPreview: promptPreview.substring(0, 500),
        responsePreview: ''
      }
    })
  }

  async findRecoverableTurnForRoom(roomId: string) {
    return await prisma.chatTurn.findFirst({
      where: {
        roomId,
        status: CHAT_TURN_STATUS.INTERRUPTED
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  async findLatestTurnForMessage(userMessageId: string) {
    return await prisma.chatTurn.findFirst({
      where: {
        userMessageId
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  async markStaleTurnsInterrupted(now = new Date()) {
    const cutoff = new Date(now.getTime() - CHAT_TURN_HEARTBEAT_TIMEOUT_MS)
    const turns = await prisma.chatTurn.findMany({
      where: {
        status: {
          in: [
            CHAT_TURN_STATUS.RECEIVED,
            CHAT_TURN_STATUS.QUEUED,
            CHAT_TURN_STATUS.RUNNING,
            CHAT_TURN_STATUS.STREAMING,
            CHAT_TURN_STATUS.WAITING_FOR_TOOLS
          ]
        },
        OR: [
          { lastHeartbeatAt: { lt: cutoff } },
          { lastHeartbeatAt: null, createdAt: { lt: cutoff } }
        ]
      },
      include: {
        messages: {
          where: { senderId: 'ai_agent' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    for (const turn of turns) {
      await prisma.$transaction(async (tx) => {
        await tx.chatTurn.update({
          where: { id: turn.id },
          data: {
            status: CHAT_TURN_STATUS.INTERRUPTED,
            finishedAt: now,
            failureReason: 'Turn interrupted after heartbeat timeout.',
            lastHeartbeatAt: now
          }
        })

        const draft = turn.messages[0]
        if (draft) {
          const metadata = {
            ...((draft.metadata as any) || {}),
            isDraft: true,
            turnStatus: CHAT_TURN_STATUS.INTERRUPTED,
            interrupted: true,
            failureReason: 'Turn interrupted after heartbeat timeout.'
          }
          await tx.chatMessage.update({
            where: { id: draft.id },
            data: { metadata: metadata as any }
          })
        }

        await tx.chatTurnEvent.create({
          data: {
            turnId: turn.id,
            type: CHAT_TURN_EVENT_TYPE.TURN_INTERRUPTED,
            data: {
              reason: 'heartbeat_timeout'
            } as any
          }
        })
      })
    }

    return turns.length
  }

  canResumeTurn(status?: string | null) {
    return shouldResumeTurn(status)
  }

  isPendingStatus(status?: string | null) {
    return isActiveChatTurnStatus(status)
  }
}

export const chatTurnService = new ChatTurnService()
