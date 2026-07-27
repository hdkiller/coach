import { beforeEach, describe, expect, it, vi } from 'vitest'

import { prisma } from '../../../../server/utils/db'
import { getActivePromotionalGrant } from '../../../../server/utils/partner-campaigns'
import {
  buildQuotaErrorPayload,
  quotaRetryAfterSeconds
} from '../../../../server/utils/quotas/engine'
import {
  quotaFeatureCode,
  resolveUpgradeForOperation
} from '../../../../server/utils/quotas/registry'

vi.mock('../../../../server/utils/partner-campaigns', () => ({
  getActivePromotionalGrant: vi.fn()
}))

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    quotaDenial: { create: vi.fn() },
    $queryRaw: vi.fn()
  }
}))

vi.mock('../../../../server/utils/date', () => ({
  getUserTimezone: vi.fn(),
  getStartOfDayUTC: vi.fn(() => new Date('2026-03-08T00:00:00.000Z')),
  getEndOfDayUTC: vi.fn(() => new Date('2026-03-08T23:59:59.999Z'))
}))

describe('quota feature codes', () => {
  it('maps metered operations to the client-facing feature', () => {
    expect(quotaFeatureCode('workout_analysis')).toBe('ACTIVITY_ANALYSIS')
    expect(quotaFeatureCode('activity_recommendation')).toBe('READINESS_RECOMMENDATION')
    expect(quotaFeatureCode('generate_structured_workout')).toBe('WORKOUT_GENERATION')
    expect(quotaFeatureCode('daily_checkin')).toBe('DAILY_CHECKIN')
  })

  it('resolves legacy operation aliases through the canonical map', () => {
    expect(quotaFeatureCode('chat_ws')).toBe('COACH_CHAT')
    expect(quotaFeatureCode('last_3_workouts_analysis')).toBe('ACTIVITY_ANALYSIS')
  })

  it('returns null for operations with no client feature, so clients fall back', () => {
    expect(quotaFeatureCode('goal_review')).toBeNull()
    expect(quotaFeatureCode('not_an_operation')).toBeNull()
  })
})

describe('upgrade resolution', () => {
  it('points at the lowest tier that actually raises the limit', () => {
    expect(resolveUpgradeForOperation('workout_analysis', 'FREE')).toEqual({
      nextTier: 'SUPPORTER',
      nextTierLimit: 30
    })
    expect(resolveUpgradeForOperation('workout_analysis', 'SUPPORTER')).toEqual({
      nextTier: 'PRO',
      nextTierLimit: 150
    })
  })

  it('offers no upgrade on the top tier', () => {
    expect(resolveUpgradeForOperation('workout_analysis', 'PRO')).toBeNull()
  })
})

describe('retry-after', () => {
  const now = new Date('2026-03-08T10:00:00.000Z')

  it('returns whole seconds until the allowance refills', () => {
    expect(quotaRetryAfterSeconds('2026-03-08T10:02:30.000Z', now)).toBe(150)
  })

  it('returns null for missing, invalid or elapsed reset times', () => {
    expect(quotaRetryAfterSeconds(null, now)).toBeNull()
    expect(quotaRetryAfterSeconds('not-a-date', now)).toBeNull()
    expect(quotaRetryAfterSeconds('2026-03-08T09:00:00.000Z', now)).toBeNull()
  })
})

describe('429 payload', () => {
  it('describes the limit without the client parsing English copy', () => {
    const payload = buildQuotaErrorPayload({
      operation: 'workout_analysis',
      allowed: false,
      used: 6,
      limit: 6,
      remaining: 0,
      window: '7 days',
      resetsAt: new Date('2099-01-01T00:00:00.000Z'),
      enforcement: 'STRICT',
      nextTier: 'SUPPORTER',
      nextTierLimit: 30
    })

    expect(payload).toMatchObject({
      code: 'QUOTA_EXCEEDED',
      operation: 'workout_analysis',
      feature: 'ACTIVITY_ANALYSIS',
      limit: 6,
      used: 6,
      remaining: 0,
      window: '7 days',
      resetsAt: '2099-01-01T00:00:00.000Z',
      requiredTier: 'SUPPORTER',
      requiredTierLimit: 30,
      quotaExceeded: true
    })
    expect(payload.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('keeps the legacy quotaExceeded flag for existing consumers', () => {
    const payload = buildQuotaErrorPayload({
      operation: 'goal_review',
      allowed: false,
      used: 1,
      limit: 1,
      remaining: 0,
      window: '24 hours',
      resetsAt: null,
      enforcement: 'STRICT'
    })

    expect(payload.quotaExceeded).toBe(true)
    expect(payload.feature).toBeNull()
    expect(payload.retryAfterSeconds).toBeNull()
    expect(payload.requiredTier).toBeNull()
  })
})

describe('checkQuota', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws a 429 carrying the full contract', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      subscriptionTier: 'FREE',
      subscriptionStatus: 'NONE',
      subscriptionPeriodEnd: null,
      trialEndsAt: null,
      timezone: 'UTC'
    } as any)
    vi.mocked(getActivePromotionalGrant).mockResolvedValue(null)
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { count: 6, firstUsedAt: new Date('2026-03-01T00:00:00.000Z') }
    ] as any)
    vi.mocked(prisma.quotaDenial.create).mockResolvedValue({} as any)

    const { checkQuota } = await import('../../../../server/utils/quotas/engine')

    await expect(checkQuota('user-123', 'workout_analysis')).rejects.toMatchObject({
      statusCode: 429,
      data: {
        code: 'QUOTA_EXCEEDED',
        feature: 'ACTIVITY_ANALYSIS',
        operation: 'workout_analysis',
        limit: 6,
        used: 6,
        requiredTier: 'SUPPORTER',
        requiredTierLimit: 30,
        quotaExceeded: true
      }
    })
  })
})
