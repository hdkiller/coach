import type { PartnerCampaign, PartnerCampaignRedemption, SubscriptionTier } from '@prisma/client'
import { prisma } from './db'
import { maxSubscriptionTier, resolveEffectiveTier } from '../../shared/effective-tier'
import { getUserEntitlements, type UserEntitlements } from './entitlements'

export type PartnerCampaignAvailability =
  'AVAILABLE' | 'DISABLED' | 'NOT_STARTED' | 'EXPIRED' | 'CAPACITY_REACHED'

export type ActivePromotionalGrant = {
  tier: SubscriptionTier
  endsAt: Date
  campaignSlug: string
  partnerName: string
  campaignName: string
}

export type PartnerCampaignPublicView = {
  slug: string
  partnerName: string
  campaignName: string
  grantedTier: SubscriptionTier
  accessDurationDays: number
  maxRedemptions: number
  redemptionCount: number
  availability: PartnerCampaignAvailability
  windowStartsAt: string | null
  windowEndsAt: string | null
}

export type PartnerRedemptionResult = {
  status: 'REDEEMED' | 'ALREADY_REDEEMED'
  redemption: {
    grantedTier: SubscriptionTier
    startsAt: string
    endsAt: string
  }
  entitlements: UserEntitlements
  paidSubscriptionPreserved: boolean
  message: string
}

const TIER_RANK: Record<SubscriptionTier, number> = {
  FREE: 0,
  SUPPORTER: 1,
  PRO: 2
}

export function normalizePartnerCampaignSlug(slug: string): string {
  return slug.trim().toLowerCase()
}

export function getCampaignAvailability(
  campaign: Pick<
    PartnerCampaign,
    'isActive' | 'windowStartsAt' | 'windowEndsAt' | 'maxRedemptions' | 'redemptionCount'
  >,
  now = new Date()
): PartnerCampaignAvailability {
  if (!campaign.isActive) return 'DISABLED'
  if (campaign.windowStartsAt && now < campaign.windowStartsAt) return 'NOT_STARTED'
  if (campaign.windowEndsAt && now > campaign.windowEndsAt) return 'EXPIRED'
  if (campaign.redemptionCount >= campaign.maxRedemptions) return 'CAPACITY_REACHED'
  return 'AVAILABLE'
}

export function toPartnerCampaignPublicView(
  campaign: PartnerCampaign,
  now = new Date()
): PartnerCampaignPublicView {
  return {
    slug: campaign.slug,
    partnerName: campaign.partnerName,
    campaignName: campaign.campaignName,
    grantedTier: campaign.grantedTier,
    accessDurationDays: campaign.accessDurationDays,
    maxRedemptions: campaign.maxRedemptions,
    redemptionCount: campaign.redemptionCount,
    availability: getCampaignAvailability(campaign, now),
    windowStartsAt: campaign.windowStartsAt?.toISOString() ?? null,
    windowEndsAt: campaign.windowEndsAt?.toISOString() ?? null
  }
}

export async function getPartnerCampaignBySlug(slug: string) {
  return prisma.partnerCampaign.findUnique({
    where: { slug: normalizePartnerCampaignSlug(slug) }
  })
}

export async function getActivePromotionalGrant(
  userId: string,
  now = new Date()
): Promise<ActivePromotionalGrant | null> {
  const redemption = await prisma.partnerCampaignRedemption.findFirst({
    where: {
      userId,
      endsAt: { gt: now }
    },
    orderBy: [{ grantedTier: 'desc' }, { endsAt: 'desc' }],
    include: {
      campaign: {
        select: {
          slug: true,
          partnerName: true,
          campaignName: true,
          grantedTier: true
        }
      }
    }
  })

  if (!redemption) return null

  return {
    tier: redemption.grantedTier,
    endsAt: redemption.endsAt,
    campaignSlug: redemption.campaign.slug,
    partnerName: redemption.campaign.partnerName,
    campaignName: redemption.campaign.campaignName
  }
}

export async function getUserRedemptionForCampaign(userId: string, campaignId: string) {
  return prisma.partnerCampaignRedemption.findUnique({
    where: {
      campaignId_userId: {
        campaignId,
        userId
      }
    }
  })
}

function buildRedemptionMessage(input: {
  grantedTier: SubscriptionTier
  endsAt: Date
  paidSubscriptionPreserved: boolean
  existingPaidTier: SubscriptionTier | null
}): string {
  const endLabel = input.endsAt.toISOString().slice(0, 10)

  if (input.paidSubscriptionPreserved && input.existingPaidTier) {
    if (TIER_RANK[input.grantedTier] > TIER_RANK[input.existingPaidTier]) {
      return `Your paid ${input.existingPaidTier} subscription stays active. You also have complimentary ${input.grantedTier} access through ${endLabel}.`
    }
    return `Your paid ${input.existingPaidTier} subscription stays active and already includes this benefit.`
  }

  return `You now have ${input.grantedTier} access through ${endLabel}. After that, your account continues on the permanent FREE tier unless you choose to upgrade.`
}

function hasActivePaidSubscription(user: {
  subscriptionTier: SubscriptionTier
  subscriptionStatus: string
  subscriptionPeriodEnd: Date | null
}): boolean {
  const now = new Date()
  const periodEnd = user.subscriptionPeriodEnd ? new Date(user.subscriptionPeriodEnd) : new Date(0)

  return (
    user.subscriptionStatus === 'ACTIVE' ||
    user.subscriptionStatus === 'CONTRIBUTOR' ||
    Boolean(user.subscriptionPeriodEnd && now < periodEnd)
  )
}

export async function redeemPartnerCampaign(
  userId: string,
  slug: string
): Promise<PartnerRedemptionResult> {
  const normalizedSlug = normalizePartnerCampaignSlug(slug)
  const now = new Date()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionPeriodEnd: true,
      trialEndsAt: true
    }
  })

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const campaign = await getPartnerCampaignBySlug(normalizedSlug)
  if (!campaign) {
    throw createError({ statusCode: 404, message: 'Partner campaign not found' })
  }

  const existingRedemption = await getUserRedemptionForCampaign(user.id, campaign.id)
  if (existingRedemption) {
    const activeGrant = await getActivePromotionalGrant(user.id, now)
    const entitlements = getUserEntitlements({
      ...user,
      promotionalGrantTier: activeGrant?.tier ?? existingRedemption.grantedTier
    })

    return {
      status: 'ALREADY_REDEEMED',
      redemption: {
        grantedTier: existingRedemption.grantedTier,
        startsAt: existingRedemption.startsAt.toISOString(),
        endsAt: existingRedemption.endsAt.toISOString()
      },
      entitlements,
      paidSubscriptionPreserved: hasActivePaidSubscription(user),
      message: buildRedemptionMessage({
        grantedTier: existingRedemption.grantedTier,
        endsAt: existingRedemption.endsAt,
        paidSubscriptionPreserved: hasActivePaidSubscription(user),
        existingPaidTier: hasActivePaidSubscription(user) ? user.subscriptionTier : null
      })
    }
  }

  const availability = getCampaignAvailability(campaign, now)
  if (availability !== 'AVAILABLE') {
    const reasonByAvailability: Record<
      Exclude<PartnerCampaignAvailability, 'AVAILABLE'>,
      string
    > = {
      DISABLED: 'disabled',
      NOT_STARTED: 'not_started',
      EXPIRED: 'expired',
      CAPACITY_REACHED: 'capacity_reached'
    }
    throw createError({
      statusCode: 409,
      message: `Campaign is ${reasonByAvailability[availability].replace('_', ' ')}`,
      data: { reason: reasonByAvailability[availability] }
    })
  }

  const startsAt = now
  const endsAt = new Date(startsAt)
  endsAt.setUTCDate(endsAt.getUTCDate() + campaign.accessDurationDays)

  const redemption = await prisma.$transaction(async (tx) => {
    const reserved = await tx.partnerCampaign.updateMany({
      where: {
        id: campaign.id,
        isActive: true,
        redemptionCount: { lt: campaign.maxRedemptions }
      },
      data: {
        redemptionCount: { increment: 1 }
      }
    })

    if (reserved.count === 0) {
      throw createError({
        statusCode: 409,
        message: 'Campaign capacity reached',
        data: { reason: 'capacity_reached' }
      })
    }

    return tx.partnerCampaignRedemption.create({
      data: {
        campaignId: campaign.id,
        userId: user.id,
        grantedTier: campaign.grantedTier,
        startsAt,
        endsAt
      }
    })
  })

  const paidSubscriptionPreserved = hasActivePaidSubscription(user)
  const entitlements = getUserEntitlements({
    ...user,
    promotionalGrantTier: redemption.grantedTier
  })

  return {
    status: 'REDEEMED',
    redemption: {
      grantedTier: redemption.grantedTier,
      startsAt: redemption.startsAt.toISOString(),
      endsAt: redemption.endsAt.toISOString()
    },
    entitlements,
    paidSubscriptionPreserved,
    message: buildRedemptionMessage({
      grantedTier: redemption.grantedTier,
      endsAt: redemption.endsAt,
      paidSubscriptionPreserved,
      existingPaidTier: paidSubscriptionPreserved ? user.subscriptionTier : null
    })
  }
}

export function getHighestActivePromotionalTier(
  redemptions: Pick<PartnerCampaignRedemption, 'grantedTier' | 'endsAt'>[],
  now = new Date()
): SubscriptionTier | null {
  let highest: SubscriptionTier | null = null

  for (const redemption of redemptions) {
    if (redemption.endsAt <= now) continue
    highest = highest
      ? maxSubscriptionTier(highest, redemption.grantedTier)
      : redemption.grantedTier
  }

  return highest
}

export function resolveUserEffectiveTier(user: {
  subscriptionTier: SubscriptionTier
  subscriptionStatus: string
  subscriptionPeriodEnd: Date | null
  trialEndsAt?: Date | null
  promotionalGrantTier?: SubscriptionTier | null
}): SubscriptionTier {
  return resolveEffectiveTier({
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus as any,
    subscriptionPeriodEnd: user.subscriptionPeriodEnd,
    trialEndsAt: user.trialEndsAt ?? null,
    promotionalGrantTier: user.promotionalGrantTier ?? null
  })
}
