import { beforeEach, describe, expect, it, vi } from 'vitest'

import { prisma } from '../../../../server/utils/db'

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    providerSubscription: { findMany: vi.fn() },
    user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() }
  }
}))

vi.mock('../../../../server/utils/partner-campaigns', () => ({
  getActivePromotionalGrant: vi.fn()
}))

vi.mock('../../../../server/utils/repositories/auditLogRepository', () => ({
  auditLogRepository: { create: vi.fn() }
}))

const FUTURE = new Date('2099-01-01T00:00:00.000Z')

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    provider: 'APPLE',
    tier: 'PRO',
    status: 'ACTIVE',
    entitlementEnd: FUTURE,
    productId: 'coachwatts_pro_annual',
    ...overrides
  }
}

describe('assertNoActiveStoreSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks web checkout while an App Store subscription is live', async () => {
    vi.mocked(prisma.providerSubscription.findMany).mockResolvedValue([subscription()] as any)
    const { assertNoActiveStoreSubscription } = await import(
      '../../../../server/utils/provider-subscriptions'
    )

    await expect(assertNoActiveStoreSubscription('user-1')).rejects.toMatchObject({
      statusCode: 409,
      data: { code: 'STORE_SUBSCRIPTION_ACTIVE', provider: 'APPLE' }
    })
  })

  it('names Google Play when that is where the athlete is billed', async () => {
    vi.mocked(prisma.providerSubscription.findMany).mockResolvedValue([
      subscription({ provider: 'GOOGLE' })
    ] as any)
    const { assertNoActiveStoreSubscription } = await import(
      '../../../../server/utils/provider-subscriptions'
    )

    await expect(assertNoActiveStoreSubscription('user-1')).rejects.toMatchObject({
      data: { provider: 'GOOGLE' }
    })
  })

  it('allows checkout when the store subscription has expired', async () => {
    vi.mocked(prisma.providerSubscription.findMany).mockResolvedValue([
      subscription({ status: 'EXPIRED', entitlementEnd: new Date('2020-01-01T00:00:00.000Z') })
    ] as any)
    const { assertNoActiveStoreSubscription } = await import(
      '../../../../server/utils/provider-subscriptions'
    )

    await expect(assertNoActiveStoreSubscription('user-1')).resolves.toBeUndefined()
  })

  it('ignores Stripe rows — those are what web checkout manages', async () => {
    vi.mocked(prisma.providerSubscription.findMany).mockResolvedValue([
      subscription({ provider: 'STRIPE', productId: 'legacy:pro' })
    ] as any)
    const { assertNoActiveStoreSubscription } = await import(
      '../../../../server/utils/provider-subscriptions'
    )

    await expect(assertNoActiveStoreSubscription('user-1')).resolves.toBeUndefined()
  })

  it('allows checkout for an athlete with no provider subscriptions', async () => {
    vi.mocked(prisma.providerSubscription.findMany).mockResolvedValue([] as any)
    const { assertNoActiveStoreSubscription } = await import(
      '../../../../server/utils/provider-subscriptions'
    )

    await expect(assertNoActiveStoreSubscription('user-1')).resolves.toBeUndefined()
  })
})
