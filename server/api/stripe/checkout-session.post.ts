import { z } from 'zod/v3'
import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { stripe } from '../../utils/stripe'
import { ensureStripeCustomerForUser } from '../../utils/stripe-customer'
import { assertNoActiveStoreSubscription } from '../../utils/provider-subscriptions'
import { requireStripeRedirectUrl } from '../../utils/stripe-redirect-url'

const checkoutSessionSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional()
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
  const { priceId, successUrl, cancelUrl } = checkoutSessionSchema.parse(body)

  // Get or create Stripe customer
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      stripeCustomerId: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    })
  }

  // Never let web checkout stack on top of an App Store / Play subscription.
  await assertNoActiveStoreSubscription(userId)

  const { customerId } = await ensureStripeCustomerForUser(user)

  let config: any
  try {
    config = useRuntimeConfig()
  } catch {
    config = {}
  }
  const baseUrl = config?.public?.siteUrl || 'http://localhost:3099'

  const success_url = requireStripeRedirectUrl(
    successUrl,
    baseUrl,
    '/settings/billing?success=true'
  )
  const cancel_url = requireStripeRedirectUrl(cancelUrl, baseUrl, '/settings/billing?canceled=true')

  // Create Stripe checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    // Collect billing address so Stripe Tax can determine the correct local tax rate
    billing_address_collection: 'required',
    // Save the collected address back to the customer for renewal invoices
    customer_update: {
      address: 'auto',
      name: 'auto'
    },
    // Automatically calculate and collect local taxes (VAT, GST, etc.)
    automatic_tax: {
      enabled: true
    },
    success_url,
    cancel_url,
    metadata: {
      userId: user.id
    }
  })

  return {
    sessionId: checkoutSession.id,
    url: checkoutSession.url
  }
})
