import type {
  Prisma,
  ProviderSubscription,
  ProviderSubscriptionStatus,
  SubscriptionEnvironment,
  SubscriptionProvider,
  SubscriptionTier
} from '@prisma/client'
import {
  pickStripeSubscriptionId,
  projectProviderSubscriptions,
  providerSubscriptionExternalId
} from '../../shared/provider-subscriptions'
import { prisma } from './db'
import { auditLogRepository } from './repositories/auditLogRepository'
import { getUserEntitlements } from './entitlements'
import { getActivePromotionalGrant } from './partner-campaigns'

export { pickStripeSubscriptionId, providerSubscriptionExternalId }

export const PRODUCT_MAPPING_DOC = 'docs/06-plans/subscription-operations.md'

function csv(value: unknown): string[] {
  return typeof value === 'string'
    ? value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    : []
}

export function resolveProviderProductTier(
  productId: string,
  entitlementIds: string[] = [],
  config = useRuntimeConfig()
): SubscriptionTier {
  if (entitlementIds.includes('pro')) return 'PRO'
  if (entitlementIds.includes('supporter')) return 'SUPPORTER'
  const supporter = csv(config.subscriptionSupporterProductIds)
  const pro = csv(config.subscriptionProProductIds)
  if (pro.includes(productId)) return 'PRO'
  if (supporter.includes(productId)) return 'SUPPORTER'
  throw createError({
    statusCode: 422,
    message: `Unknown subscription product '${productId}'; update ${PRODUCT_MAPPING_DOC}`
  })
}

export function providerFromRevenueCatStore(store: string): SubscriptionProvider | null {
  if (store === 'APP_STORE' || store === 'app_store' || store === 'MAC_APP_STORE') return 'APPLE'
  if (store === 'PLAY_STORE' || store === 'play_store') return 'GOOGLE'
  if (store === 'STRIPE' || store === 'stripe') return 'STRIPE'
  return null
}

export function normalizeRevenueCatStatus(input: {
  type?: string
  expirationAt?: Date | null
  gracePeriodEnd?: Date | null
  billingIssue?: boolean
  unsubscribeDetected?: boolean
  refunded?: boolean
}): ProviderSubscriptionStatus {
  if (input.refunded || input.type === 'REFUND' || input.type === 'REFUNDED') return 'REVOKED'
  if (input.type === 'EXPIRATION') return 'EXPIRED'
  if (input.type === 'SUBSCRIPTION_PAUSED') return 'PAUSED'
  if (input.billingIssue) {
    return input.gracePeriodEnd && input.gracePeriodEnd > new Date()
      ? 'GRACE_PERIOD'
      : 'BILLING_RETRY'
  }
  if (input.unsubscribeDetected || input.type === 'CANCELLATION') return 'CANCELED'
  return 'ACTIVE'
}

function legacyStatus(status: ProviderSubscriptionStatus) {
  if (status === 'ACTIVE') return 'ACTIVE' as const
  if (status === 'CANCELED') return 'CANCELED' as const
  if (status === 'GRACE_PERIOD' || status === 'BILLING_RETRY' || status === 'PAST_DUE') {
    return 'PAST_DUE' as const
  }
  return 'NONE' as const
}

export async function recomputeCanonicalSubscription(userId: string) {
  const [user, subscriptions] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { subscriptionStatus: true } }),
    prisma.providerSubscription.findMany({ where: { userId } })
  ])
  const projection = projectProviderSubscriptions(subscriptions)
  if (user.subscriptionStatus !== 'CONTRIBUTOR') {
    const primary = projection.valid.sort((a, b) => {
      const ranks = { FREE: 0, SUPPORTER: 1, PRO: 2 }
      return ranks[b.tier] - ranks[a.tier]
    })[0]
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: projection.tier,
        subscriptionStatus: primary ? legacyStatus(primary.status) : 'NONE',
        subscriptionPeriodEnd: primary?.entitlementEnd ?? null
      }
    })
  }
  if (projection.hasCollision) {
    await auditLogRepository.log({
      userId,
      action: 'SUBSCRIPTION_PROVIDER_COLLISION',
      resourceType: 'SUBSCRIPTION',
      metadata: { providers: projection.valid.map((item) => item.provider), tier: projection.tier }
    })
  }
  return projection
}

async function resolveStripeExternalId(userId: string, externalId: string): Promise<string> {
  const preferred = pickStripeSubscriptionId(externalId)
  if (preferred) return preferred
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeSubscriptionId: true }
  })
  return pickStripeSubscriptionId(user?.stripeSubscriptionId) ?? externalId
}

/** Collapse RevenueCat composite STRIPE rows onto the canonical Stripe subscription id row. */
export async function expireSupersededStripeProviderRows(userId: string, keepExternalId: string) {
  const result = await prisma.providerSubscription.updateMany({
    where: {
      userId,
      provider: 'STRIPE',
      externalId: { not: keepExternalId },
      status: { notIn: ['EXPIRED', 'REVOKED'] }
    },
    data: {
      status: 'EXPIRED',
      rawStatus: 'SUPERSEDED_DUPLICATE_STRIPE_ROW',
      autoRenew: false
    }
  })
  return result.count
}

export async function upsertProviderSubscription(input: {
  userId: string
  provider: SubscriptionProvider
  externalId: string
  productId: string
  tier: SubscriptionTier
  status: ProviderSubscriptionStatus
  rawStatus?: string | null
  entitlementEnd?: Date | null
  autoRenew?: boolean | null
  environment?: SubscriptionEnvironment
  managementUrl?: string | null
  lastEventId?: string | null
  lastEventAt?: Date | null
  metadata?: Prisma.InputJsonValue
}): Promise<{ subscription: ProviderSubscription; stale: boolean }> {
  const externalId =
    input.provider === 'STRIPE'
      ? await resolveStripeExternalId(input.userId, input.externalId)
      : input.externalId
  const payload = { ...input, externalId }
  const existing = await prisma.providerSubscription.findUnique({
    where: { provider_externalId: { provider: payload.provider, externalId } }
  })
  if (existing?.lastEventAt && payload.lastEventAt && existing.lastEventAt > payload.lastEventAt) {
    if (payload.provider === 'STRIPE') {
      await expireSupersededStripeProviderRows(payload.userId, externalId)
    }
    return { subscription: existing, stale: true }
  }
  const subscription = await prisma.providerSubscription.upsert({
    where: { provider_externalId: { provider: payload.provider, externalId } },
    create: { ...payload, environment: payload.environment ?? 'PRODUCTION' },
    update: payload
  })
  if (payload.provider === 'STRIPE') {
    await expireSupersededStripeProviderRows(payload.userId, externalId)
  }
  await recomputeCanonicalSubscription(payload.userId)
  return { subscription, stale: false }
}

export async function subscriptionSummary(userId: string) {
  await ensureLegacyStripeSubscription(userId)
  const [subscriptions, user, activePromotionalGrant] = await Promise.all([
    prisma.providerSubscription.findMany({
      where: { userId },
      orderBy: [{ tier: 'desc' }, { entitlementEnd: 'desc' }]
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionPeriodEnd: true,
        trialEndsAt: true
      }
    }),
    getActivePromotionalGrant(userId)
  ])
  const projection = projectProviderSubscriptions(subscriptions)
  const legacyTier = getUserEntitlements({
    ...user,
    promotionalGrantTier: activePromotionalGrant?.tier ?? null
  }).tier
  const ranks = { FREE: 0, SUPPORTER: 1, PRO: 2 }
  const tier = ranks[legacyTier] > ranks[projection.tier] ? legacyTier : projection.tier
  return {
    tier,
    hasCollision: projection.hasCollision,
    acquisitionSuppressed: projection.valid.length > 0 || user.subscriptionStatus === 'CONTRIBUTOR',
    subscriptions: subscriptions.map((item) => ({
      provider: item.provider,
      productId: item.productId,
      tier: item.tier,
      status: item.status,
      entitlementEnd: item.entitlementEnd,
      autoRenew: item.autoRenew,
      managementUrl: item.managementUrl
    }))
  }
}

export async function ensureLegacyStripeSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stripeSubscriptionId: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionPeriodEnd: true
    }
  })
  if (!user?.stripeSubscriptionId || user.subscriptionTier === 'FREE') return
  const status: ProviderSubscriptionStatus =
    user.subscriptionStatus === 'ACTIVE'
      ? 'ACTIVE'
      : user.subscriptionStatus === 'CANCELED'
        ? 'CANCELED'
        : user.subscriptionStatus === 'PAST_DUE'
          ? 'PAST_DUE'
          : 'UNKNOWN'
  await prisma.providerSubscription.upsert({
    where: { provider_externalId: { provider: 'STRIPE', externalId: user.stripeSubscriptionId } },
    create: {
      userId,
      provider: 'STRIPE',
      externalId: user.stripeSubscriptionId,
      productId: `legacy:${user.subscriptionTier.toLowerCase()}`,
      tier: user.subscriptionTier,
      status,
      rawStatus: user.subscriptionStatus,
      entitlementEnd: user.subscriptionPeriodEnd,
      environment: 'PRODUCTION'
    },
    update: {
      userId,
      tier: user.subscriptionTier,
      status,
      rawStatus: user.subscriptionStatus,
      entitlementEnd: user.subscriptionPeriodEnd
    }
  })
  await expireSupersededStripeProviderRows(userId, user.stripeSubscriptionId)
}

/**
 * Store subscriptions the athlete currently holds through Apple or Google.
 * Stripe rows are excluded on purpose: they are what the web checkout manages.
 */
export async function getActiveStoreSubscriptions(userId: string) {
  const subscriptions = await prisma.providerSubscription.findMany({ where: { userId } })
  return projectProviderSubscriptions(subscriptions).valid.filter(
    (item) => item.provider === 'APPLE' || item.provider === 'GOOGLE'
  )
}

/**
 * Refuse a Stripe purchase while an App Store or Play subscription is live —
 * the athlete would pay twice for the same entitlement and Stripe cannot cancel
 * a store subscription on their behalf.
 */
export async function assertNoActiveStoreSubscription(userId: string) {
  const storeSubscriptions = await getActiveStoreSubscriptions(userId)
  if (storeSubscriptions.length === 0) return

  const provider = storeSubscriptions[0]!.provider
  throw createError({
    statusCode: 409,
    message:
      provider === 'APPLE'
        ? 'Your subscription is billed through the App Store. Manage or cancel it in your Apple ID subscription settings before subscribing on the web, so you are not charged twice.'
        : 'Your subscription is billed through Google Play. Manage or cancel it in your Play Store subscription settings before subscribing on the web, so you are not charged twice.',
    data: {
      code: 'STORE_SUBSCRIPTION_ACTIVE',
      provider
    }
  })
}
