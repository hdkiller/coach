import type { SubscriptionEnvironment } from '@prisma/client'
import { prisma } from './db'
import { auditLogRepository } from './repositories/auditLogRepository'
import {
  normalizeRevenueCatStatus,
  providerFromRevenueCatStore,
  providerSubscriptionExternalId,
  resolveProviderProductTier,
  upsertProviderSubscription
} from './provider-subscriptions'

type RevenueCatSubscription = {
  expires_date?: string | null
  grace_period_expires_date?: string | null
  store?: string
  store_transaction_id?: string | null
  unsubscribe_detected_at?: string | null
  billing_issues_detected_at?: string | null
  refunded_at?: string | null
}

type RevenueCatSubscriberResponse = {
  request_date?: string
  subscriber: {
    management_url?: string | null
    entitlements?: Record<string, { product_identifier?: string }>
    subscriptions?: Record<string, RevenueCatSubscription>
  }
}

type RevenueCatRequestOptions = {
  method?: 'POST'
  headers: Record<string, string>
  body?: Record<string, string>
}

// Bypass Nitro internal-route inference for dynamic external RevenueCat URLs.
const revenueCatFetch = $fetch as unknown as <T = unknown>(
  url: string,
  options: RevenueCatRequestOptions
) => Promise<T>

function requiredRevenueCatKey(): string {
  const key = useRuntimeConfig().revenueCatSecretApiKey
  if (!key)
    throw createError({ statusCode: 503, message: 'RevenueCat reconciliation is not configured' })
  return key
}

export async function fetchRevenueCatSubscriber(userId: string) {
  const config = useRuntimeConfig()
  return await revenueCatFetch<RevenueCatSubscriberResponse>(
    `${config.revenueCatApiBaseUrl || 'https://api.revenuecat.com/v1'}/subscribers/${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${requiredRevenueCatKey()}`, Accept: 'application/json' } }
  )
}

export async function reconcileRevenueCatSubscriber(userId: string) {
  const response = await fetchRevenueCatSubscriber(userId)
  const eventAt = response.request_date ? new Date(response.request_date) : new Date()
  const seen: string[] = []
  const mappingFailures: string[] = []
  const entitlementByProduct = new Map<string, string[]>()
  for (const [entitlementId, entitlement] of Object.entries(
    response.subscriber.entitlements ?? {}
  )) {
    if (!entitlement.product_identifier) continue
    const current = entitlementByProduct.get(entitlement.product_identifier) ?? []
    current.push(entitlementId)
    entitlementByProduct.set(entitlement.product_identifier, current)
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeSubscriptionId: true }
  })
  for (const [productId, item] of Object.entries(response.subscriber.subscriptions ?? {})) {
    const provider = providerFromRevenueCatStore(item.store ?? '')
    if (!provider) continue
    const externalId = providerSubscriptionExternalId({
      userId,
      provider,
      productId,
      storeTransactionId: item.store_transaction_id,
      stripeSubscriptionId: user?.stripeSubscriptionId
    })
    // Always mark RC-present rows as seen so mapping failures cannot expire active subs.
    seen.push(externalId)
    let tier
    try {
      tier = resolveProviderProductTier(productId, entitlementByProduct.get(productId))
    } catch {
      mappingFailures.push(productId)
      continue
    }
    const entitlementEnd = item.expires_date ? new Date(item.expires_date) : null
    const gracePeriodEnd = item.grace_period_expires_date
      ? new Date(item.grace_period_expires_date)
      : null
    const expired = Boolean(
      entitlementEnd &&
      entitlementEnd <= new Date() &&
      (!gracePeriodEnd || gracePeriodEnd <= new Date())
    )
    await upsertProviderSubscription({
      userId,
      provider,
      externalId,
      productId,
      tier,
      status: expired
        ? 'EXPIRED'
        : normalizeRevenueCatStatus({
            expirationAt: entitlementEnd,
            gracePeriodEnd,
            billingIssue: Boolean(item.billing_issues_detected_at),
            unsubscribeDetected: Boolean(item.unsubscribe_detected_at),
            refunded: Boolean(item.refunded_at)
          }),
      rawStatus: expired ? 'EXPIRED' : 'REVENUECAT_RECONCILE',
      entitlementEnd:
        gracePeriodEnd && gracePeriodEnd > (entitlementEnd ?? new Date(0))
          ? gracePeriodEnd
          : entitlementEnd,
      autoRenew: !item.unsubscribe_detected_at,
      environment: (item.store_transaction_id?.startsWith('test')
        ? 'SANDBOX'
        : 'PRODUCTION') as SubscriptionEnvironment,
      managementUrl: response.subscriber.management_url,
      lastEventAt: eventAt,
      metadata: { storeTransactionId: item.store_transaction_id ?? null }
    })
  }
  const missing = await prisma.providerSubscription.findMany({
    where: { userId, provider: { in: ['APPLE', 'GOOGLE'] }, externalId: { notIn: seen } }
  })
  for (const item of missing) {
    await upsertProviderSubscription({
      userId,
      provider: item.provider,
      externalId: item.externalId,
      productId: item.productId,
      tier: item.tier,
      status: 'EXPIRED',
      rawStatus: 'ABSENT_FROM_REVENUECAT',
      entitlementEnd: item.entitlementEnd,
      environment: item.environment,
      managementUrl: response.subscriber.management_url,
      lastEventAt: eventAt
    })
  }
  if (mappingFailures.length > 0) {
    await auditLogRepository.log({
      userId,
      action: 'REVENUECAT_PRODUCT_MAPPING_FAILED',
      resourceType: 'SUBSCRIPTION',
      metadata: { productIds: mappingFailures, source: 'reconcile' }
    })
  }
}

export async function trackStripeInRevenueCat(userId: string, subscriptionId: string) {
  const config = useRuntimeConfig()
  if (!config.revenueCatStripePublicApiKey) return
  try {
    await revenueCatFetch(
      `${config.revenueCatApiBaseUrl || 'https://api.revenuecat.com/v1'}/receipts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.revenueCatStripePublicApiKey}`,
          'X-Platform': 'stripe'
        },
        body: { app_user_id: userId, fetch_token: subscriptionId }
      }
    )
  } catch (error) {
    console.error('RevenueCat Stripe tracking failed; Stripe remains canonical until retry', error)
  }
}
