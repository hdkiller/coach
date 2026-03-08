import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../../../server/utils/db'
import { checkQuota } from '../../../../server/utils/quotas/engine'

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    $queryRaw: vi.fn()
  }
}))

vi.mock('../../../../server/utils/date', () => ({
  getUserTimezone: vi.fn(),
  getStartOfDayUTC: vi.fn(() => new Date('2026-03-08T00:00:00.000Z')),
  getEndOfDayUTC: vi.fn(() => new Date('2026-03-08T23:59:59.999Z'))
}))

describe('quota engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws an H3-style 429 error when a strict quota is exceeded', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscriptionTier: 'FREE',
      trialEndsAt: null,
      timezone: 'UTC'
    } as any)

    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        count: 3,
        firstUsedAt: new Date('2026-03-01T00:00:00.000Z')
      }
    ] as any)

    await expect(checkQuota('user-123', 'wellness_analysis')).rejects.toMatchObject({
      statusCode: 429,
      statusMessage: 'Quota exceeded for wellness_analysis. Upgrade your plan for higher limits.',
      data: {
        operation: 'wellness_analysis',
        quotaExceeded: true
      },
      quotaExceeded: true
    })
  })
})
