import type { User, SubscriptionTier, SubscriptionStatus } from '@prisma/client'

export interface UserEntitlements {
  tier: 'FREE' | 'SUPPORTER' | 'PRO'
  autoSync: boolean
  autoAnalysis: boolean
  aiModel: 'flash' | 'pro'
  priorityProcessing: boolean
  proactivity: boolean
}

/**
 * Calculate user entitlements based on subscription status and period
 *
 * Handles grace period: Users retain access if:
 * 1. Status is ACTIVE, OR
 * 2. Status is CANCELED/PAST_DUE/NONE but current time is before periodEnd
 */
export function getUserEntitlements(
  user: Pick<User, 'subscriptionTier' | 'subscriptionStatus' | 'subscriptionPeriodEnd'>
): UserEntitlements {
  const now = new Date()
  const periodEnd = user.subscriptionPeriodEnd ? new Date(user.subscriptionPeriodEnd) : new Date(0)

  // A user is effectively "Premium" if:
  // 1. Status is ACTIVE
  // 2. OR Status is CANCELED (or NONE/PAST_DUE) but we are still before periodEnd (Grace Period)
  const isEffectivePremium =
    user.subscriptionStatus === 'ACTIVE' || (user.subscriptionPeriodEnd && now < periodEnd)

  // Fallback to FREE if subscription is dead
  const effectiveTier = isEffectivePremium ? user.subscriptionTier : 'FREE'

  return {
    tier: effectiveTier,
    autoSync: effectiveTier !== 'FREE',
    autoAnalysis: effectiveTier !== 'FREE',
    aiModel: effectiveTier === 'PRO' ? 'pro' : 'flash',
    priorityProcessing: effectiveTier !== 'FREE',
    proactivity: effectiveTier === 'PRO'
  }
}

/**
 * Check if a user has a specific entitlement
 */
export function hasEntitlement(
  user: Pick<User, 'subscriptionTier' | 'subscriptionStatus' | 'subscriptionPeriodEnd'>,
  feature: keyof Omit<UserEntitlements, 'tier'>
): boolean | string {
  const entitlements = getUserEntitlements(user)
  return entitlements[feature]
}

/**
 * Check if a user has a minimum tier level
 */
export function hasMinimumTier(
  user: Pick<User, 'subscriptionTier' | 'subscriptionStatus' | 'subscriptionPeriodEnd'>,
  minimumTier: 'FREE' | 'SUPPORTER' | 'PRO'
): boolean {
  const entitlements = getUserEntitlements(user)
  const tierHierarchy = { FREE: 0, SUPPORTER: 1, PRO: 2 }
  return tierHierarchy[entitlements.tier] >= tierHierarchy[minimumTier]
}
