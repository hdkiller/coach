import type { Prisma } from '@prisma/client'
import { prisma } from '../db'
import { expandStoredChatMessages, truncateMessages } from '../chat/history'
import {
  hasVisibleAssistantMetadataArtifacts,
  shouldExcludeAssistantMessageFromHistory
} from '../chat/message-state'
import { getJsonObject } from '../prisma-json'
import {
  CHAT_TURN_EVENT_TYPE,
  CHAT_TURN_HEARTBEAT_TIMEOUT_MS,
  CHAT_TURN_TIMEOUT_REASON,
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
  coachingContext?: {
    actorUserId?: string
    isCoaching?: boolean
  }
}

class ChatTurnService {
  getTurnMetadata(turn: { metadata?: Prisma.JsonValue | null }) {
    return getJsonObject(turn.metadata) || {}
  }

  mergeTurnMetadata(
    turn: { metadata?: Prisma.JsonValue | null } | null | undefined,
    patch: Record<string, any>
  ) {
    return {
      ...this.getTurnMetadata(turn || {}),
      ...patch
    } as Prisma.InputJsonValue
  }

  getRequestSnapshot(turn: { metadata?: Prisma.JsonValue | null }): PersistedRequestSnapshot {
    const metadata = this.getTurnMetadata(turn)
    return {
      messages: Array.isArray(metadata.request?.messages) ? metadata.request.messages : [],
      files: Array.isArray(metadata.request?.files) ? metadata.request.files : [],
      replyMessage: metadata.request?.replyMessage,
      lastMessageId:
        typeof metadata.request?.lastMessageId === 'string'
          ? metadata.request.lastMessageId
          : undefined,
      content: typeof metadata.request?.content === 'string' ? metadata.request.content : undefined,
      coachingContext:
        metadata.request?.coachingContext && typeof metadata.request.coachingContext === 'object'
          ? metadata.request.coachingContext
          : undefined
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
    // Statuses that indicate a room already has an in-progress turn
    const blockingStatuses = [
      CHAT_TURN_STATUS.RECEIVED,
      CHAT_TURN_STATUS.RUNNING,
      CHAT_TURN_STATUS.STREAMING,
      CHAT_TURN_STATUS.WAITING_FOR_TOOLS
    ] as const

    for (let attempt = 0; attempt < 5; attempt += 1) {
      // Step 1: find all rooms that currently have an active turn
      const activeTurnRooms = await prisma.chatTurn.findMany({
        where: { status: { in: [...blockingStatuses] } },
        select: { roomId: true },
        distinct: ['roomId']
      })
      const blockedRoomIds = activeTurnRooms.map((t) => t.roomId)

      // Step 2: find the oldest queued turn in an unblocked room
      const candidate = await prisma.chatTurn.findFirst({
        where: {
          status: CHAT_TURN_STATUS.QUEUED,
          ...(blockedRoomIds.length > 0 ? { roomId: { notIn: blockedRoomIds } } : {})
        },
        orderBy: [{ createdAt: 'asc' }]
      })

      if (!candidate) {
        if (blockedRoomIds.length > 0) {
          // There may still be queued turns, but all their rooms are blocked.
          // They will become claimable once the active turns complete or are
          // recovered by the heartbeat sweep.
          const pendingCount = await prisma.chatTurn.count({
            where: { status: CHAT_TURN_STATUS.QUEUED }
          })
          if (pendingCount > 0) {
            console.warn(
              `[ChatTurnService] ${pendingCount} queued turn(s) are blocked by ${blockedRoomIds.length} room(s) with active turns. They will be processed once those turns complete.`
            )
          }
        }
        return null
      }

      // Step 3: CAS-claim the candidate (guards against concurrent workers)
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
      // Another worker claimed it first — retry with fresh state
    }

    return null
  }

  async tryStartExecution(
    turnId: string,
    runId: string | null | undefined,
    data: Partial<{
      startedAt: Date | null
      finishedAt: Date | null
      failureReason: string | null
      assistantMessageId: string | null
      providerRequestId: string | null
      metadata: Prisma.InputJsonValue
    }> = {}
  ) {
    if (!runId) {
      return null
    }

    const started = await prisma.chatTurn.updateMany({
      where: {
        id: turnId,
        runId,
        status: CHAT_TURN_STATUS.RECEIVED
      },
      data: {
        status: CHAT_TURN_STATUS.RUNNING,
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

    if (started.count === 0) {
      return null
    }

    return await prisma.chatTurn.findUnique({
      where: { id: turnId }
    })
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
      const existingMessage = await prisma.chatMessage.findUnique({
        where: { id: params.existingMessageId },
        select: { metadata: true }
      })

      return await prisma.chatMessage.update({
        where: { id: params.existingMessageId },
        data: {
          content: ' ',
          metadata: {
            ...((existingMessage?.metadata as any) || {}),
            isDraft: true,
            turnId: params.turnId,
            turnStatus: params.status,
            hideUntilContent: true,
            hiddenBecauseEmptyFailure: false
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
          turnId: params.turnId,
          turnStatus: params.status,
          hideUntilContent: true,
          hiddenBecauseEmptyFailure: false
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

  async buildStableRequestMessages(roomId: string, lastMessageId: string, limit = 25) {
    const roomMessages = await prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        createdAt: true,
        senderId: true,
        content: true,
        files: true,
        turnId: true,
        metadata: true,
        turn: {
          select: {
            id: true,
            metadata: true,
            status: true,
            failureReason: true,
            startedAt: true,
            finishedAt: true
          }
        }
      }
    })

    const stableMessages = roomMessages.filter((message) => {
      if (message.id === lastMessageId) {
        return true
      }

      if (shouldExcludeAssistantMessageFromHistory(message)) {
        return false
      }

      if (!message.turn) {
        return true
      }

      return !isActiveChatTurnStatus(message.turn.status)
    })

    return truncateMessages(expandStoredChatMessages(stableMessages), limit)
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
          const draftMetadata = ((draft.metadata as any) || {}) as Record<string, any>
          const metadata = {
            ...draftMetadata,
            isDraft: true,
            turnStatus: CHAT_TURN_STATUS.INTERRUPTED,
            interrupted: true,
            failureReason: 'Turn interrupted after heartbeat timeout.',
            timeoutReason: CHAT_TURN_TIMEOUT_REASON.HEARTBEAT_TIMEOUT,
            hiddenBecauseEmptyFailure:
              typeof draft.content === 'string' &&
              draft.content.trim().length === 0 &&
              !hasVisibleAssistantMetadataArtifacts(draftMetadata)
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
              reason: CHAT_TURN_TIMEOUT_REASON.HEARTBEAT_TIMEOUT
            } as any
          }
        })

        await tx.chatTurn.update({
          where: { id: turn.id },
          data: {
            metadata: this.mergeTurnMetadata(turn, {
              timeoutReason: CHAT_TURN_TIMEOUT_REASON.HEARTBEAT_TIMEOUT,
              executionPhase: 'orphaned',
              finishedAt: now.toISOString()
            })
          }
        })

        await tx.llmUsage.updateMany({
          where: {
            turnId: turn.id,
            operation: 'chat_turn_start',
            errorType: 'IN_PROGRESS'
          },
          data: {
            success: false,
            errorType: 'INTERRUPTED',
            errorMessage: 'Turn interrupted after heartbeat timeout.',
            durationMs:
              turn.startedAt instanceof Date
                ? Math.max(0, now.getTime() - turn.startedAt.getTime())
                : Math.max(0, now.getTime() - turn.createdAt.getTime())
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
