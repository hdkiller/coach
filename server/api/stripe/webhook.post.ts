import type Stripe from 'stripe'
import type { SubscriptionStatus, SubscriptionTier } from '@prisma/client'
import { prisma } from '../../utils/db'
import { stripe } from '../../utils/stripe'
import { auditLogRepository } from '../../utils/repositories/auditLogRepository'

/**
 * Map Stripe subscription status to internal status
 */
function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'ACTIVE'
    case 'past_due':
      return 'PAST_DUE'
    case 'canceled':
    case 'unpaid':
      return 'CANCELED'
    default:
      return 'NONE'
  }
}

/**
 * Determine subscription tier from Stripe price/product IDs
 */
function getPriceProductId(priceProduct: Stripe.Price['product']): string | null {
  if (!priceProduct) return null
  return typeof priceProduct === 'string' ? priceProduct : priceProduct.id
}

function getSubscriptionTier(item: Stripe.SubscriptionItem | undefined): SubscriptionTier {
  const config = useRuntimeConfig()
  const priceId = item?.price?.id
  const productId = getPriceProductId(item?.price?.product)

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

  if (priceId && supporterPriceIds.includes(priceId)) {
    return 'SUPPORTER'
  }
  if (priceId && proPriceIds.includes(priceId)) {
    return 'PRO'
  }

  if (productId === config.stripeSupporterProductId) {
    return 'SUPPORTER'
  }
  if (productId === config.stripeProProductId) {
    return 'PRO'
  }

  // Default to FREE if product not recognized
  return 'FREE'
}

/**
 * Handle subscription created or updated
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const subscriptionId = subscription.id

  const firstItem = subscription.items.data[0]
  const tier = getSubscriptionTier(firstItem)
  if (!firstItem?.price?.id) {
    console.error('No Stripe price found in subscription')
    return
  }

  const productId = getPriceProductId(firstItem.price.product) || '(unknown-product)'
  console.log(`Resolved tier '${tier}' for price '${firstItem.price.id}' product '${productId}'`)

  const status = mapStripeStatus(subscription.status)
  const periodEndTimestamp = subscription.items.data[0]?.current_period_end
  const periodEnd = periodEndTimestamp ? new Date(periodEndTimestamp * 1000) : null
  const startedAt = new Date(subscription.created * 1000)

  // Update user in database (Skip if user is a CONTRIBUTOR)
  // We use updateMany but usually there is only one user per customerId
  // We want to set subscriptionStartedAt ONLY if it's currently null and they are moving to a premium tier
  if (tier !== 'FREE' && status === 'ACTIVE') {
    const users = await prisma.user.findMany({
      where: { stripeCustomerId: customerId }
    })
    for (const user of users) {
      if (!user.subscriptionStartedAt) {
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStartedAt: startedAt }
        })
      }
    }
  }

  await prisma.user.updateMany({
    where: {
      stripeCustomerId: customerId,
      NOT: { subscriptionStatus: 'CONTRIBUTOR' }
    },
    data: {
      stripeSubscriptionId: subscriptionId,
      subscriptionTier: tier,
      subscriptionStatus: status,
      subscriptionPeriodEnd: periodEnd
    }
  })

  console.log(`Updated subscription for customer ${customerId}: ${tier} (${status})`)
}

/**
 * Handle subscription deleted (complete cancellation)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Downgrade to FREE tier (Skip if user is a CONTRIBUTOR)
  await prisma.user.updateMany({
    where: {
      stripeCustomerId: customerId,
      NOT: { subscriptionStatus: 'CONTRIBUTOR' }
    },
    data: {
      stripeSubscriptionId: null,
      subscriptionTier: 'FREE',
      subscriptionStatus: 'NONE',
      subscriptionPeriodEnd: null
    }
  })

  console.log(`Subscription deleted for customer ${customerId}, downgraded to FREE`)
}

/**
 * Handle checkout session completed (initial subscription)
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!subscriptionId) {
    console.error('No subscription ID in checkout session')
    return
  }

  // Retrieve the full subscription object
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  await handleSubscriptionChange(subscription)

  console.log(`Checkout completed for customer ${customerId}, subscription ${subscriptionId}`)
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const webhookSecret = config.stripeWebhookSecret

  if (!webhookSecret) {
    throw createError({
      statusCode: 500,
      message: 'STRIPE_WEBHOOK_SECRET is not configured'
    })
  }

  // Get the raw body as a Buffer (required for Stripe signature verification)
  const body = await readRawBody(event, false)
  if (!body) {
    throw createError({
      statusCode: 400,
      message: 'Missing request body'
    })
  }

  // Get the Stripe signature header
  const signature = getHeader(event, 'stripe-signature')
  if (!signature) {
    throw createError({
      statusCode: 400,
      message: 'Missing stripe-signature header'
    })
  }

  let stripeEvent: Stripe.Event

  try {
    // Verify the webhook signature
    stripeEvent = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    throw createError({
      statusCode: 400,
      message: `Webhook Error: ${err.message}`
    })
  }

  // Log the event for debugging
  console.log(`Received Stripe webhook: ${stripeEvent.type}`)

  // Handle the event
  try {
    // 1. Find user for audit logging
    const customerId = (stripeEvent.data.object as any).customer as string
    let userId: string | undefined

    if (customerId) {
      const user = await prisma.user.findUnique({
        where: { stripeCustomerId: customerId },
        select: { id: true }
      })
      userId = user?.id
    }

    // 2. Log to AuditLog
    await auditLogRepository.log({
      userId,
      action: `STRIPE_WEBHOOK_${stripeEvent.type.toUpperCase().replace(/\./g, '_')}`,
      resourceType: 'SUBSCRIPTION',
      resourceId: (stripeEvent.data.object as any).id,
      metadata: {
        stripeEventType: stripeEvent.type,
        stripeEventId: stripeEvent.id
      }
    })

    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(stripeEvent.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed': {
        // Handle payment failure - could trigger email notification
        const failedInvoice = stripeEvent.data.object as Stripe.Invoice
        console.log(`Payment failed for customer ${failedInvoice.customer}`)
        break
      }

      case 'invoice.payment_succeeded': {
        // Handle successful payment - renewal confirmation
        const successInvoice = stripeEvent.data.object as Stripe.Invoice
        console.log(`Payment succeeded for customer ${successInvoice.customer}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`)
    }

    return { received: true }
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    if (error.stack) console.error(error.stack)
    throw createError({
      statusCode: 500,
      message: `Webhook processing error: ${error.message}`
    })
  }
})
