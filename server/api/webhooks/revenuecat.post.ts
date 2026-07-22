import type { Prisma, ProviderSubscriptionStatus, SubscriptionEnvironment } from '@prisma/client'
import { prisma } from '../../utils/db'
import { isUniqueConstraintError } from '../../utils/invite-code'
import { auditLogRepository } from '../../utils/repositories/auditLogRepository'
import {
  normalizeRevenueCatStatus,
  providerFromRevenueCatStore,
  providerSubscriptionExternalId,
  resolveProviderProductTier,
  upsertProviderSubscription
} from '../../utils/provider-subscriptions'
import { reconcileRevenueCatSubscriber } from '../../utils/revenuecat'

type RevenueCatEvent = {
  id: string
  type: string
  event_timestamp_ms: number
  app_user_id?: string
  original_app_user_id?: string
  aliases?: string[]
  transferred_to?: string[]
  store?: string
  environment?: string
  product_id?: string
  entitlement_id?: string
  entitlement_ids?: string[]
  transaction_id?: string
  original_transaction_id?: string
  expiration_at_ms?: number | null
  auto_resume_at_ms?: number | null
  cancel_reason?: string | null
}

function eventStatus(event: RevenueCatEvent): ProviderSubscriptionStatus {
  if (event.type === 'BILLING_ISSUE') return 'BILLING_RETRY'
  if (event.type === 'SUBSCRIPTION_PAUSED') return 'PAUSED'
  if (event.type === 'EXPIRATION') return 'EXPIRED'
  if (event.type === 'CANCELLATION' && event.cancel_reason === 'CUSTOMER_SUPPORT') return 'REVOKED'
  return normalizeRevenueCatStatus({
    type: event.type,
    unsubscribeDetected: event.type === 'CANCELLATION'
  })
}

async function rejectWebhook(action: string, metadata: Record<string, unknown>) {
  await auditLogRepository.log({ action, resourceType: 'SUBSCRIPTION', metadata })
}

async function claimLifecycleEvent(input: {
  externalEventId: string
  eventType: string
  eventAt: Date
  environment: SubscriptionEnvironment
  payload: Prisma.InputJsonValue
}) {
  try {
    return await prisma.subscriptionLifecycleEvent.create({
      data: {
        externalEventId: input.externalEventId,
        eventType: input.eventType,
        eventAt: input.eventAt,
        environment: input.environment,
        payload: input.payload
      }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) return null
    throw error
  }
}

async function releaseLifecycleClaim(claimId: string) {
  try {
    await prisma.subscriptionLifecycleEvent.delete({ where: { id: claimId } })
  } catch (error) {
    // Already removed by a concurrent cleanup path.
    if ((error as { code?: string }).code === 'P2025') return
    throw error
  }
}

export default defineEventHandler(async (h3Event) => {
  const config = useRuntimeConfig()
  const expectedAuthorization = config.revenueCatWebhookAuthorization
  if (!expectedAuthorization || getHeader(h3Event, 'authorization') !== expectedAuthorization) {
    await rejectWebhook('REVENUECAT_WEBHOOK_REJECTED', { reason: 'invalid_authorization' })
    throw createError({ statusCode: 401, message: 'Invalid RevenueCat webhook authorization' })
  }
  const body = await readBody<{ api_version?: string; event?: RevenueCatEvent }>(h3Event)
  const event = body?.event
  if (!event?.id || !event.type || !event.event_timestamp_ms) {
    await rejectWebhook('REVENUECAT_WEBHOOK_REJECTED', { reason: 'invalid_payload' })
    throw createError({ statusCode: 400, message: 'Invalid RevenueCat webhook payload' })
  }
  const environment = event.environment === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION'
  if (environment === 'SANDBOX' && config.revenueCatAcceptSandbox !== 'true') {
    await rejectWebhook('REVENUECAT_WEBHOOK_REJECTED', {
      reason: 'sandbox_disabled',
      eventId: event.id
    })
    throw createError({ statusCode: 422, message: 'Sandbox RevenueCat events are disabled' })
  }

  const eventAt = new Date(event.event_timestamp_ms)
  const claim = await claimLifecycleEvent({
    externalEventId: event.id,
    eventType: event.type,
    eventAt,
    environment,
    payload: body as Prisma.InputJsonValue
  })
  if (!claim) {
    return { received: true, duplicate: true }
  }

  try {
    if (event.type === 'TEST') {
      return { received: true, test: true }
    }

    const provider = providerFromRevenueCatStore(event.store ?? '')
    const userCandidates = [
      event.app_user_id,
      event.original_app_user_id,
      ...(event.aliases ?? []),
      ...(event.transferred_to ?? [])
    ].filter((value): value is string => Boolean(value))
    const user = await prisma.user.findFirst({
      where: { id: { in: userCandidates } },
      select: { id: true, stripeSubscriptionId: true }
    })

    if (user && ['TRANSFER', 'TEMPORARY_ENTITLEMENT_GRANT'].includes(event.type)) {
      await reconcileRevenueCatSubscriber(user.id)
      await prisma.subscriptionLifecycleEvent.update({
        where: { id: claim.id },
        data: { userId: user.id, provider: provider ?? undefined }
      })
      await auditLogRepository.log({
        userId: user.id,
        action: `REVENUECAT_WEBHOOK_${event.type}`,
        resourceType: 'SUBSCRIPTION',
        metadata: { eventId: event.id, reconciled: true }
      })
      return { received: true, reconciled: true }
    }

    if (!provider || !user || !event.product_id) {
      await rejectWebhook('REVENUECAT_WEBHOOK_REJECTED', {
        reason: !provider ? 'unknown_store' : !user ? 'unknown_user' : 'missing_product',
        eventId: event.id
      })
      throw createError({ statusCode: 422, message: 'RevenueCat event could not be mapped' })
    }

    let tier
    try {
      tier = resolveProviderProductTier(
        event.product_id,
        event.entitlement_ids ?? (event.entitlement_id ? [event.entitlement_id] : [])
      )
    } catch (error) {
      await rejectWebhook('REVENUECAT_PRODUCT_MAPPING_FAILED', {
        eventId: event.id,
        productId: event.product_id,
        environment
      })
      throw error
    }

    const externalId = providerSubscriptionExternalId({
      userId: user.id,
      provider,
      productId: event.product_id,
      stripeSubscriptionId: user.stripeSubscriptionId,
      originalTransactionId: event.original_transaction_id,
      transactionId: event.transaction_id
    })
    const result = await upsertProviderSubscription({
      userId: user.id,
      provider,
      externalId,
      productId: event.product_id,
      tier,
      status: eventStatus(event),
      rawStatus: event.type,
      entitlementEnd: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
      autoRenew: !['CANCELLATION', 'EXPIRATION', 'SUBSCRIPTION_PAUSED'].includes(event.type),
      environment,
      lastEventId: event.id,
      lastEventAt: eventAt,
      metadata: {
        transactionId: event.transaction_id ?? null,
        originalTransactionId: event.original_transaction_id ?? null
      }
    })
    await prisma.subscriptionLifecycleEvent.update({
      where: { id: claim.id },
      data: {
        providerSubscriptionId: result.subscription.id,
        userId: user.id,
        provider
      }
    })
    await auditLogRepository.log({
      userId: user.id,
      action: result.stale ? 'REVENUECAT_WEBHOOK_STALE' : `REVENUECAT_WEBHOOK_${event.type}`,
      resourceType: 'SUBSCRIPTION',
      resourceId: result.subscription.id,
      metadata: { eventId: event.id, provider, environment }
    })
    return { received: true, stale: result.stale }
  } catch (error) {
    await releaseLifecycleClaim(claim.id)
    throw error
  }
})
