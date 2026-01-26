import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { stripe } from '../../utils/stripe'
import type { SubscriptionStatus, SubscriptionTier } from '@prisma/client'
import type Stripe from 'stripe'

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

function getSubscriptionTier(productId: string): SubscriptionTier {
  const config = useRuntimeConfig()
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
    select: { stripeCustomerId: true }
  })

  if (!user?.stripeCustomerId) {
    return { status: 'no_customer_id' }
  }

  // Fetch subscriptions from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: 'all',
    expand: ['data.items.data.price']
  })

  // Find the most "active" subscription (Active > PastDue > Canceled)
  // And highest Tier (Pro > Supporter)
  // For simplicity, just take the first 'active' one, or first 'trialing'

  const activeSub = subscriptions.data.find(
    (sub) => sub.status === 'active' || sub.status === 'trialing'
  )

  if (activeSub) {
    const productId = activeSub.items.data[0]?.price.product as string
    const tier = getSubscriptionTier(productId)
    const status = mapStripeStatus(activeSub.status)

    // Safety check for date
    let periodEnd: Date | null = null
    if ((activeSub as any).current_period_end) {
      periodEnd = new Date((activeSub as any).current_period_end * 1000)
    }

    console.log(`Syncing subscription for user ${session.user.id}:`, {
      subId: activeSub.id,
      status: activeSub.status,
      periodEndRaw: (activeSub as any).current_period_end,
      periodEndParsed: periodEnd
    })
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        stripeSubscriptionId: activeSub.id,
        subscriptionTier: tier,
        subscriptionStatus: status,
        subscriptionPeriodEnd: periodEnd
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
