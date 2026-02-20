import { z } from 'zod'
import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { stripe } from '../../utils/stripe'

const changePlanSchema = z.object({
  priceId: z.string(),
  direction: z.enum(['upgrade', 'downgrade']).optional().default('upgrade')
})

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
  const { priceId, direction } = changePlanSchema.parse(body)

  // Get user with Stripe subscription ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stripeSubscriptionId: true,
      subscriptionTier: true,
      stripeCustomerId: true
    }
  })

  if (!user || !user.stripeSubscriptionId) {
    throw createError({
      statusCode: 400,
      message: 'No active subscription found to change. Please use checkout instead.'
    })
  }

  // 1. Retrieve the subscription from Stripe to get the item ID
  const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
  const subscriptionItem = subscription.items.data[0]

  if (!subscriptionItem) {
    throw createError({
      statusCode: 500,
      message: 'Subscription has no items. Please contact support.'
    })
  }

  // 2. Update the subscription in Stripe
  // For upgrades, we use 'always_invoice' to charge the difference now.
  // For downgrades, we use 'create_prorations' (default) to credit the difference to the next bill.
  const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
    items: [
      {
        id: subscriptionItem.id,
        price: priceId
      }
    ],
    proration_behavior: direction === 'upgrade' ? 'always_invoice' : 'create_prorations',
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent']
  })

  // 3. Handle payment confirmation if needed (SCA)
  const latestInvoice = updatedSubscription.latest_invoice as any
  const paymentIntent = latestInvoice?.payment_intent

  if (paymentIntent && paymentIntent.status === 'requires_action') {
    // If SCA is required, we still need to redirect or handle it on the frontend.
    // However, since we want "one-click", if it fails we might need to fallback to portal.
    return {
      status: 'requires_action',
      clientSecret: paymentIntent.client_secret,
      subscriptionId: updatedSubscription.id
    }
  }

  // 4. Update the user in our DB immediately (optional, as webhook will also do it)
  // But doing it here makes the UI feel faster
  // Note: We don't know the tier yet just from priceId easily without a lookup,
  // but we can trust the webhook for the source of truth or do a quick lookup here if we wanted.

  return {
    status: 'success',
    subscriptionId: updatedSubscription.id
  }
})
