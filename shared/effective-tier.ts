import type { SubscriptionStatus, SubscriptionTier } from '@prisma/client'

export type EffectiveTierSource = 'FREE' | 'TRIAL' | 'SUBSCRIPTION' | 'PROMOTIONAL'

export type EffectiveTierInput = {
  subscriptionTier: SubscriptionTier
  subscriptionStatus: SubscriptionStatus
  subscriptionPeriodEnd: Date | null
  trialEndsAt?: Date | null
  promotionalGrantTier?: SubscriptionTier | null
  now?: Date
}

const TIER_RANK: Record<SubscriptionTier, number> = {
  FREE: 0,
  SUPPORTER: 1,
  PRO: 2
}

export function maxSubscriptionTier(
  left: SubscriptionTier,
  right: SubscriptionTier
): SubscriptionTier {
  return TIER_RANK[left] >= TIER_RANK[right] ? left : right
}

export function resolveEffectiveTier(input: EffectiveTierInput): SubscriptionTier {
  const now = input.now ?? new Date()
  const periodEnd = input.subscriptionPeriodEnd
    ? new Date(input.subscriptionPeriodEnd)
    : new Date(0)

  const isContributor = input.subscriptionStatus === 'CONTRIBUTOR'
  const isEffectivePremium =
    input.subscriptionStatus === 'ACTIVE' ||
    isContributor ||
    Boolean(input.subscriptionPeriodEnd && now < periodEnd)

  let effectiveTier: SubscriptionTier = 'FREE'

  if (isContributor) {
    effectiveTier = 'PRO'
  } else if (isEffectivePremium) {
    effectiveTier = input.subscriptionTier
  }

  const isTrialActive = Boolean(
    input.trialEndsAt && new Date(input.trialEndsAt) > now && input.subscriptionTier === 'FREE'
  )
  if (isTrialActive && !isEffectivePremium) {
    effectiveTier = maxSubscriptionTier(effectiveTier, 'SUPPORTER')
  }

  if (input.promotionalGrantTier) {
    effectiveTier = maxSubscriptionTier(effectiveTier, input.promotionalGrantTier)
  }

  return effectiveTier
}

export function tierMeetsMinimum(tier: SubscriptionTier, minimumTier: SubscriptionTier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[minimumTier]
}
