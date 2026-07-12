import { beforeEach, describe, expect, it, vi } from 'vitest'

import { chatTurnService } from '../../../../../server/utils/services/chatTurnService'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  updateMany: vi.fn(),
  messageUpdate: vi.fn(),
  eventCreate: vi.fn(),
  usageUpdateMany: vi.fn(),
  transaction: vi.fn()
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    chatTurn: {
      findMany: mocks.findMany
    },
    $transaction: mocks.transaction
  }
}))

const now = new Date('2026-07-12T12:00:00.000Z')

function buildTurn(recoveryAttempts = 0) {
  return {
    id: 'turn-1',
    roomId: 'room-1',
    userId: 'user-1',
    userMessageId: 'message-1',
    assistantMessageId: 'assistant-1',
    status: 'RUNNING',
    lineageId: 'turn-1',
    retryOfTurnId: null,
    runId: 'app-worker:old-worker:turn-1:1',
    startedAt: new Date('2026-07-12T11:55:00.000Z'),
    finishedAt: null,
    failureReason: null,
    lastHeartbeatAt: new Date('2026-07-12T11:56:00.000Z'),
    providerRequestId: null,
    metadata: { recoveryAttempts },
    createdAt: new Date('2026-07-12T11:54:00.000Z'),
    updatedAt: new Date('2026-07-12T11:56:00.000Z'),
    messages: [
      {
        id: 'assistant-1',
        content: 'partial response',
        metadata: { isDraft: true }
      }
    ],
    toolExecutions: []
  }
}

describe('chat turn restart recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        chatTurn: { updateMany: mocks.updateMany },
        chatMessage: { update: mocks.messageUpdate },
        chatTurnEvent: { create: mocks.eventCreate },
        llmUsage: { updateMany: mocks.usageUpdateMany }
      })
    )
    mocks.updateMany.mockResolvedValue({ count: 1 })
    mocks.messageUpdate.mockResolvedValue({})
    mocks.eventCreate.mockResolvedValue({})
    mocks.usageUpdateMany.mockResolvedValue({ count: 1 })
  })

  it('requeues a stale active turn and clears its partial draft', async () => {
    mocks.findMany.mockResolvedValue([buildTurn()])

    await expect(chatTurnService.recoverStaleTurns(now)).resolves.toBe(1)

    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'QUEUED',
          runId: null,
          startedAt: null,
          finishedAt: null,
          failureReason: null
        })
      })
    )
    expect(mocks.messageUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ content: ' ' })
      })
    )
  })

  it('interrupts a stale turn after recovery attempts are exhausted', async () => {
    mocks.findMany.mockResolvedValue([buildTurn(2)])

    await expect(chatTurnService.recoverStaleTurns(now)).resolves.toBe(1)

    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'INTERRUPTED',
          failureReason: 'Turn interrupted after recovery attempts were exhausted.'
        })
      })
    )
  })

  it('does not recover a turn whose heartbeat was concurrently refreshed', async () => {
    mocks.findMany.mockResolvedValue([buildTurn()])
    mocks.updateMany.mockResolvedValue({ count: 0 })

    await expect(chatTurnService.recoverStaleTurns(now)).resolves.toBe(0)

    expect(mocks.messageUpdate).not.toHaveBeenCalled()
    expect(mocks.eventCreate).not.toHaveBeenCalled()
  })

  it('does not replay a turn with an uncertain mutating tool execution', async () => {
    const turn = buildTurn()
    turn.toolExecutions = [{ status: 'STARTED', toolName: 'create_planned_workout' }]
    mocks.findMany.mockResolvedValue([turn])

    await expect(chatTurnService.recoverStaleTurns(now)).resolves.toBe(1)

    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'INTERRUPTED',
          failureReason:
            'Turn interrupted because a mutating tool may have completed during worker restart.'
        })
      })
    )
  })
})
