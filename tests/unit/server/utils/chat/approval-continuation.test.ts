import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    chatMessage: {
      findMany: vi.fn()
    }
  }
}))

vi.mock('../../../../server/utils/db', () => ({
  prisma: prismaMock
}))

const { buildCanonicalApprovalResponse } =
  await import('../../../server/utils/chat/approval-continuation')

describe('buildCanonicalApprovalResponse', () => {
  beforeEach(() => {
    prismaMock.chatMessage.findMany.mockReset()
  })

  it('builds a canonical approval response for a pending approval', async () => {
    prismaMock.chatMessage.findMany.mockResolvedValue([
      {
        id: 'assistant-1',
        metadata: {
          pendingApprovals: [
            {
              toolCallId: 'approval-1',
              toolName: 'create_workout',
              args: { title: 'Run' }
            }
          ]
        }
      }
    ])

    await expect(
      buildCanonicalApprovalResponse({
        roomId: 'room-1',
        approvalId: 'approval-1',
        approved: true,
        reason: 'Looks good.'
      })
    ).resolves.toEqual({
      type: 'tool-approval-response',
      toolCallId: 'approval-1',
      approvalId: 'approval-1',
      approved: true,
      reason: 'Looks good.'
    })
  })

  it('rejects unknown approval ids', async () => {
    prismaMock.chatMessage.findMany.mockResolvedValue([])

    await expect(
      buildCanonicalApprovalResponse({
        roomId: 'room-1',
        approvalId: 'missing',
        approved: true
      })
    ).rejects.toMatchObject({
      statusCode: 400
    })
  })
})
