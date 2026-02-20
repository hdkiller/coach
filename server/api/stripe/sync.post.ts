import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { stripe } from '../../utils/stripe'
import type { SubscriptionStatus, SubscriptionTier } from '@prisma/client'
import type Stripe from 'stripe'

function mapStripeStatus(subscription: Stripe.Subscription): SubscriptionStatus {
  if (subscription.cancel_at_period_end) {
    return 'CANCELED'
  }

  switch (subscription.status) {
    case 'active':
    case 'trialing':
      return 'ACTIVE'
    case 'past_due':
    case 'incomplete':
      return 'PAST_DUE'
    case 'canceled':
    case 'unpaid':
      return 'CANCELED'
    default:
      return 'NONE'
  }
}

function getPriceProductId(priceProduct: Stripe.Price['product']): string | null {
  if (!priceProduct) return null
  return typeof priceProduct === 'string' ? priceProduct : priceProduct.id
}

function getSubscriptionTier(item: Stripe.SubscriptionItem | undefined): SubscriptionTier {
  const config = useRuntimeConfig()

  const priceId = item?.price?.id
  const productId = getPriceProductId((item?.price?.product as any) ?? null)

  const supporterPriceIds = [
    config.stripeSupporterMonthlyPriceId,
    config.stripeSupporterAnnualPriceId,
    config.stripeSupporterMonthlyEurPriceId,
    config.stripeSupporterAnnualEurPriceId
  ].filter(Boolean)
  const proPriceIds = [
    config.stripeProMonthlyPriceId,
    config.stripeProAnnualPriceId,
    config.stripeProMonthlyEurPriceId,
    config.stripeProAnnualEurPriceId
  ].filter(Boolean)

  console.log(`[Sync] Resolving tier for priceId: ${priceId}, productId: ${productId}`)
  console.log(`[Sync] Matches Supporter? ${priceId && supporterPriceIds.includes(priceId)}`)
  console.log(`[Sync] Matches Pro? ${priceId && proPriceIds.includes(priceId)}`)

  if (priceId && supporterPriceIds.includes(priceId)) return 'SUPPORTER'
  if (priceId && proPriceIds.includes(priceId)) return 'PRO'
  if (productId === config.stripeSupporterProductId) return 'SUPPORTER'
  if (productId === config.stripeProProductId) return 'PRO'
  return 'FREE'
}

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true, subscriptionStatus: true }
  })

  // Skip sync for contributors (Manual Override)
  if (user?.subscriptionStatus === 'CONTRIBUTOR') {
    return { status: 'skipped_contributor' }
  }

  if (!user?.stripeCustomerId) {
    return { status: 'no_customer_id' }
  }

  // Fetch subscriptions from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: 'all',
    expand: ['data.items.data.price'],
    limit: 20
  })

  // Check for Subscription Schedules (Pending Changes)
  const schedules = await stripe.subscriptionSchedules.list({
    customer: user.stripeCustomerId,
    limit: 1
  })

  let pendingTier: SubscriptionTier | null = null
  let pendingDate: Date | null = null

  if (schedules.data.length > 0) {
    const schedule = schedules.data[0]
    const nextPhase = schedule.phases.find((p) => p.start_date > Date.now() / 1000)
    if (nextPhase && nextPhase.items.length > 0) {
      // Create a dummy item to reuse getSubscriptionTier logic
      const dummyItem = { price: { id: nextPhase.items[0].price } } as any
      pendingTier = getSubscriptionTier(dummyItem)
      pendingDate = new Date(nextPhase.start_date * 1000)
      console.log(
        `[Sync] Found pending ${pendingTier} change scheduled for ${pendingDate.toISOString()}`
      )
    }
  }

  console.log(
    `[Sync] Found ${subscriptions.data.length} total subscriptions for user ${session.user.id}`
  )
  subscriptions.data.forEach((sub) => {
    console.log(
      `[Sync] - Sub: ${sub.id}, Status: ${sub.status}, CancelAtEnd: ${sub.cancel_at_period_end}, Created: ${new Date(sub.created * 1000).toISOString()}`
    )
  })

  // Sort by created date descending (newest first)
  const sortedSubs = [...subscriptions.data].sort((a, b) => b.created - a.created)

  // Find the most relevant subscription
  // Priority: Active/Trialing > PastDue/Incomplete
  const activeSub =
    sortedSubs.find((sub) => sub.status === 'active' || sub.status === 'trialing') ||
    sortedSubs.find((sub) => sub.status === 'past_due' || sub.status === 'incomplete')

  if (activeSub) {
    const tier = getSubscriptionTier(activeSub.items.data[0])
    const status = mapStripeStatus(activeSub)

    const firstItem = activeSub.items.data[0]
    const priceId = firstItem?.price?.id
    const productId = getPriceProductId((firstItem?.price?.product as any) ?? null)
    const periodEnd = activeSub.current_period_end
      ? new Date(activeSub.current_period_end * 1000)
      : null
    const startedAt = new Date(activeSub.created * 1000)

    console.log(`[Sync] Found subscription ${activeSub.id} for user ${session.user.id}:`, {
      stripeStatus: activeSub.status,
      internalStatus: status,
      cancelAtPeriodEnd: activeSub.cancel_at_period_end,
      tier,
      priceId,
      productId,
      periodEnd
    })

    // Check if we need to update startedAt
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionStartedAt: true }
    })

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        stripeSubscriptionId: activeSub.id,
        subscriptionTier: tier,
        subscriptionStatus: status,
        subscriptionPeriodEnd: periodEnd,
        pendingSubscriptionTier: pendingTier,
        pendingSubscriptionPeriodEnd: pendingDate,
        ...(currentUser?.subscriptionStartedAt ? {} : { subscriptionStartedAt: startedAt })
      }
    })
    return { status: 'synced', tier, subscriptionStatus: status }
  } else {
    // If no active subscription found, ensure we downgrade if needed (or keep cancelled state)
    // But be careful not to overwrite if they have a non-renewing one that is still valid?
    // Stripe status 'active' covers 'cancel_at_period_end' cases too.

    // If we found NO active/trialing, check for others?
    // Let's just set to NONE/FREE if nothing active is found
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        subscriptionTier: 'FREE',
        subscriptionStatus: 'NONE',
        subscriptionPeriodEnd: null // Or keep it if we want history?
      }
    })
    return { status: 'synced_empty' }
  }
})
