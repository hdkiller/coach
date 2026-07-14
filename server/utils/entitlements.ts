import type { SubscriptionStatus, SubscriptionTier, User } from '@prisma/client'
import { resolveEffectiveTier } from '../../shared/effective-tier'

export interface UserEntitlements {
  tier: 'FREE' | 'SUPPORTER' | 'PRO'
  autoSync: boolean
  autoAnalysis: boolean
  aiModel: 'flash' | 'pro'
  priorityProcessing: boolean
  proactivity: boolean
}

export type EntitlementUser = Pick<
  User,
  'subscriptionTier' | 'subscriptionStatus' | 'subscriptionPeriodEnd' | 'trialEndsAt'
> & {
  promotionalGrantTier?: SubscriptionTier | null
}

function entitlementsFromTier(effectiveTier: SubscriptionTier): UserEntitlements {
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
 * Calculate user entitlements based on paid subscription, trial, and promotional grants.
 *
 * Handles grace period: Users retain access if:
 * 1. Status is ACTIVE, OR
 * 2. Status is CANCELED/PAST_DUE/NONE but current time is before periodEnd
 */
export function getUserEntitlements(user: EntitlementUser): UserEntitlements {
  const config = useRuntimeConfig()

  // If Stripe is not configured (self-hosted mode), everyone is PRO
  if (!config.stripeSecretKey) {
    return {
      tier: 'PRO',
      autoSync: true,
      autoAnalysis: true,
      aiModel: 'pro',
      priorityProcessing: true,
      proactivity: true
    }
  }

  const effectiveTier = resolveEffectiveTier({
    subscriptionTier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus as SubscriptionStatus,
    subscriptionPeriodEnd: user.subscriptionPeriodEnd,
    trialEndsAt: user.trialEndsAt,
    promotionalGrantTier: user.promotionalGrantTier ?? null
  })

  return entitlementsFromTier(effectiveTier)
}

/**
 * Check if a user has a specific entitlement
 */
export function hasEntitlement(
  user: EntitlementUser,
  feature: keyof Omit<UserEntitlements, 'tier'>
): boolean | string {
  const entitlements = getUserEntitlements(user)
  return entitlements[feature]
}

/**
 * Check if a user has a minimum tier level
 */
export function hasMinimumTier(
  user: EntitlementUser,
  minimumTier: 'FREE' | 'SUPPORTER' | 'PRO'
): boolean {
  const entitlements = getUserEntitlements(user)
  const tierHierarchy = { FREE: 0, SUPPORTER: 1, PRO: 2 }
  return tierHierarchy[entitlements.tier] >= tierHierarchy[minimumTier]
}
