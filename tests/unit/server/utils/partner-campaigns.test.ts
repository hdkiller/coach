import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PartnerCampaign } from '@prisma/client'
import {
  getCampaignAvailability,
  getHighestActivePromotionalTier,
  listBrowsablePartnerCampaigns,
  redeemPartnerCampaign
} from '../../../../server/utils/partner-campaigns'

import { prisma } from '../../../../server/utils/db'

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    partnerCampaign: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn()
    },
    partnerCampaignRedemption: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn()
    },
    $transaction: vi.fn()
  }
}))

vi.stubGlobal('useRuntimeConfig', () => ({
  stripeSecretKey: 'sk_test'
}))

vi.mock('../../../../server/utils/entitlements', async () => {
  const actual = await vi.importActual('../../../../server/utils/entitlements')
  return {
    ...actual,
    getUserEntitlements: vi.fn((user: any) => ({
      tier: user.promotionalGrantTier || user.subscriptionTier || 'FREE',
      autoSync: (user.promotionalGrantTier || user.subscriptionTier) !== 'FREE',
      autoAnalysis: (user.promotionalGrantTier || user.subscriptionTier) !== 'FREE',
      aiModel:
        user.promotionalGrantTier === 'PRO' || user.subscriptionTier === 'PRO' ? 'pro' : 'flash',
      priorityProcessing: (user.promotionalGrantTier || user.subscriptionTier) !== 'FREE',
      proactivity: user.promotionalGrantTier === 'PRO' || user.subscriptionTier === 'PRO'
    }))
  }
})

vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  ;(error as any).data = err.data
  return error
})

const baseCampaign: PartnerCampaign = {
  id: 'campaign-1',
  slug: 'skool4cyclists',
  partnerName: 'Jack Burke / SKOOL 4 Cyclists',
  campaignName: 'SKOOL 4 Cyclists PRO pilot',
  grantedTier: 'PRO',
  accessDurationDays: 60,
  maxRedemptions: 50,
  redemptionCount: 0,
  windowStartsAt: null,
  windowEndsAt: null,
  isActive: true,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z')
}

describe('partner campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('detects disabled and expired campaigns', () => {
    expect(getCampaignAvailability({ ...baseCampaign, isActive: false })).toBe('DISABLED')
    expect(
      getCampaignAvailability({
        ...baseCampaign,
        windowEndsAt: new Date('2026-01-01T00:00:00.000Z')
      })
    ).toBe('EXPIRED')
    expect(
      getCampaignAvailability({
        ...baseCampaign,
        redemptionCount: 50
      })
    ).toBe('CAPACITY_REACHED')
  })

  it('lists browsable partner campaigns without redemption counts', async () => {
    vi.mocked(prisma.partnerCampaign.findMany).mockResolvedValue([
      {
        ...baseCampaign,
        campaignEvents: [
          {
            publicEvent: {
              slug: 'pilis-kupa-2026',
              title: 'Pilis Kupa',
              date: new Date('2026-09-27T12:00:00.000Z')
            }
          }
        ]
      },
      {
        ...baseCampaign,
        id: 'campaign-2',
        slug: 'expired-offer',
        isActive: true,
        windowEndsAt: new Date('2026-01-01T00:00:00.000Z'),
        campaignEvents: []
      }
    ] as any)

    const partners = await listBrowsablePartnerCampaigns(new Date('2026-07-17T00:00:00.000Z'))
    expect(partners).toHaveLength(1)
    expect(partners[0]?.slug).toBe('skool4cyclists')
    expect(partners[0]?.primaryEvent?.slug).toBe('pilis-kupa-2026')
    expect((partners[0] as any).redemptionCount).toBeUndefined()
    expect((partners[0] as any).maxRedemptions).toBeUndefined()
  })

  it('returns idempotent result for duplicate redemption', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      subscriptionTier: 'FREE',
      subscriptionStatus: 'NONE',
      subscriptionPeriodEnd: null,
      trialEndsAt: null
    } as any)
    vi.mocked(prisma.partnerCampaign.findUnique).mockResolvedValue(baseCampaign)
    vi.mocked(prisma.partnerCampaignRedemption.findUnique).mockResolvedValue({
      id: 'redemption-1',
      campaignId: 'campaign-1',
      userId: 'user-1',
      grantedTier: 'PRO',
      startsAt: new Date('2026-07-01T00:00:00.000Z'),
      endsAt: new Date('2026-08-30T00:00:00.000Z'),
      redeemedAt: new Date('2026-07-01T00:00:00.000Z'),
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-07-01T00:00:00.000Z')
    } as any)
    vi.mocked(prisma.partnerCampaignRedemption.findFirst).mockResolvedValue({
      grantedTier: 'PRO',
      endsAt: new Date('2026-08-30T00:00:00.000Z'),
      campaign: {
        slug: 'skool4cyclists',
        partnerName: 'Jack Burke / SKOOL 4 Cyclists',
        campaignName: 'SKOOL 4 Cyclists PRO pilot',
        grantedTier: 'PRO'
      }
    } as any)

    const result = await redeemPartnerCampaign('user-1', 'skool4cyclists')

    expect(result.status).toBe('ALREADY_REDEEMED')
    expect(result.entitlements.tier).toBe('PRO')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('redeems without touching Stripe subscription fields', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-2',
      subscriptionTier: 'SUPPORTER',
      subscriptionStatus: 'ACTIVE',
      subscriptionPeriodEnd: new Date('2026-12-01T00:00:00.000Z'),
      trialEndsAt: null
    } as any)
    vi.mocked(prisma.partnerCampaign.findUnique).mockResolvedValue(baseCampaign)
    vi.mocked(prisma.partnerCampaignRedemption.findUnique).mockResolvedValue(null)

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      vi.mocked(prisma.partnerCampaign.updateMany).mockResolvedValue({ count: 1 } as any)
      vi.mocked(prisma.partnerCampaignRedemption.create).mockResolvedValue({
        id: 'redemption-2',
        campaignId: 'campaign-1',
        userId: 'user-2',
        grantedTier: 'PRO',
        startsAt: new Date('2026-07-14T00:00:00.000Z'),
        endsAt: new Date('2026-09-12T00:00:00.000Z'),
        redeemedAt: new Date('2026-07-14T00:00:00.000Z'),
        createdAt: new Date('2026-07-14T00:00:00.000Z'),
        updatedAt: new Date('2026-07-14T00:00:00.000Z')
      } as any)

      return callback({
        partnerCampaign: {
          updateMany: prisma.partnerCampaign.updateMany
        },
        partnerCampaignRedemption: {
          create: prisma.partnerCampaignRedemption.create
        }
      })
    })

    const result = await redeemPartnerCampaign('user-2', 'skool4cyclists')

    expect(result.status).toBe('REDEEMED')
    expect(result.paidSubscriptionPreserved).toBe(true)
    expect(result.entitlements.tier).toBe('PRO')
  })

  it('rejects redemption when capacity is exhausted', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-3',
      subscriptionTier: 'FREE',
      subscriptionStatus: 'NONE',
      subscriptionPeriodEnd: null,
      trialEndsAt: null
    } as any)
    vi.mocked(prisma.partnerCampaign.findUnique).mockResolvedValue({
      ...baseCampaign,
      redemptionCount: 50
    })
    vi.mocked(prisma.partnerCampaignRedemption.findUnique).mockResolvedValue(null)

    await expect(redeemPartnerCampaign('user-3', 'skool4cyclists')).rejects.toMatchObject({
      statusCode: 409
    })
  })

  it('expires promotional grants automatically by time', () => {
    const tier = getHighestActivePromotionalTier(
      [
        {
          grantedTier: 'PRO',
          endsAt: new Date('2026-01-01T00:00:00.000Z')
        }
      ],
      new Date('2026-07-14T00:00:00.000Z')
    )

    expect(tier).toBeNull()
  })

  it('keeps client and server entitlements aligned for promotional PRO', async () => {
    const { getUserEntitlements } = await import('../../../../server/utils/entitlements')
    const entitlements = getUserEntitlements({
      subscriptionTier: 'FREE',
      subscriptionStatus: 'NONE',
      subscriptionPeriodEnd: null,
      trialEndsAt: null,
      promotionalGrantTier: 'PRO'
    })

    expect(entitlements.tier).toBe('PRO')
    expect(entitlements.aiModel).toBe('pro')
    expect(entitlements.proactivity).toBe(true)
  })
})
