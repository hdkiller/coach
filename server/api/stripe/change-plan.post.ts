import type Stripe from 'stripe'
import type { SubscriptionTier } from '@prisma/client'
import { z } from 'zod/v3'
import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { stripe } from '../../utils/stripe'
import { isLifetimeSubscriber, stripeBillingResetData } from '../../utils/lifetime-subscription'
import { assertNoActiveStoreSubscription } from '../../utils/provider-subscriptions'
import { resolveSubscriptionTier } from '../../utils/subscription-tier'

const changePlanSchema = z.object({
  priceId: z.string(),
  // Client hint only — proration is decided from tier ranks below so same-tier
  // interval switches cannot be mis-labeled as immediate-charge upgrades.
  direction: z.enum(['upgrade', 'downgrade']).optional().default('upgrade')
})

const TIER_RANK: Record<SubscriptionTier, number> = {
  FREE: 0,
  SUPPORTER: 1,
  PRO: 2
}

/**
 * True tier upgrades invoice the prorated difference immediately.
 * Same-tier interval switches and downgrades credit/debit the next invoice.
 */
function prorationBehaviorForTiers(
  currentTier: SubscriptionTier,
  targetTier: SubscriptionTier
): 'always_invoice' | 'create_prorations' {
  return TIER_RANK[targetTier] > TIER_RANK[currentTier] ? 'always_invoice' : 'create_prorations'
}

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }
  const userId = session.user.id

  // Validate request body
  const body = await readBody(event)
  const { priceId } = changePlanSchema.parse(body)

  // Get user with Stripe subscription ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stripeSubscriptionId: true,
      subscriptionTier: true,
      stripeCustomerId: true,
      subscriptionStatus: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  if (isLifetimeSubscriber(user)) {
    throw createError({
      statusCode: 409,
      message: 'Lifetime access cannot be changed through Stripe billing.'
    })
  }

  await assertNoActiveStoreSubscription(userId)

  if (!user.stripeSubscriptionId) {
    throw createError({
      statusCode: 400,
      message: 'No active subscription found to change. Please use checkout instead.'
    })
  }

  let subscription

  // If the stored subscription belongs to another Stripe instance, recover by
  // clearing the stale billing linkage and letting the frontend start checkout.
  try {
    subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
  } catch (error: any) {
    if (error?.type !== 'StripeInvalidRequestError' && error?.code !== 'resource_missing') {
      throw error
    }

    await prisma.user.update({
      where: { id: userId },
      data: stripeBillingResetData(isLifetimeSubscriber(user))
    })

    return {
      status: 'checkout_required'
    }
  }

  const subscriptionItem = subscription.items.data[0]

  if (!subscriptionItem) {
    throw createError({
      statusCode: 500,
      message: 'Subscription has no items. Please contact support.'
    })
  }

  const config = useRuntimeConfig()
  const currentTier = await resolveSubscriptionTier(subscriptionItem, config, stripe)
  const targetItem = { price: { id: priceId } } as Stripe.SubscriptionItem
  const targetTier = await resolveSubscriptionTier(targetItem, config, stripe)
  const proration_behavior = prorationBehaviorForTiers(currentTier, targetTier)

  // 2. Update the subscription in Stripe
  // Upgrades (higher tier): `always_invoice` charges the difference now.
  // Downgrades and same-tier interval switches: `create_prorations` on next invoice.
  //
  // `latest_invoice.payment_intent` no longer exists on the Invoice object from
  // API version 2025-03-31.basil onwards — the client secret now lives on
  // `confirmation_secret`. Expanding the old path made every authentication and
  // decline look like a success.
  const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
    items: [
      {
        id: subscriptionItem.id,
        price: priceId
      }
    ],
    proration_behavior,
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.confirmation_secret']
  })

  // 3. Decide the outcome from what Stripe actually reports.
  const latestInvoice =
    typeof updatedSubscription.latest_invoice === 'string'
      ? null
      : (updatedSubscription.latest_invoice ?? null)
  const clientSecret = latestInvoice?.confirmation_secret?.client_secret ?? null

  // With `default_incomplete`, a price change that cannot be paid immediately is
  // parked in `pending_update` — the athlete keeps the old plan until it clears.
  const changeIsPending = Boolean(updatedSubscription.pending_update)
  const invoiceUnpaid = Boolean(
    latestInvoice && latestInvoice.status !== 'paid' && latestInvoice.status !== 'void'
  )

  if (changeIsPending || invoiceUnpaid) {
    if (clientSecret) {
      return {
        status: 'requires_action',
        clientSecret,
        subscriptionId: updatedSubscription.id
      }
    }

    // No client secret to confirm against: the charge failed outright.
    return {
      status: 'payment_failed',
      subscriptionId: updatedSubscription.id,
      message:
        'Your bank declined the charge for this plan change, so your current plan is unchanged. Update your payment method and try again.'
    }
  }

  // 4. The webhook remains the source of truth for tier changes; returning here
  // just lets the UI react immediately.
  return {
    status: 'success',
    subscriptionId: updatedSubscription.id
  }
})
