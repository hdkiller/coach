import { z } from 'zod'
import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { stripe } from '../../utils/stripe'

const portalSessionSchema = z.object({
  returnUrl: z.string().optional()
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
  const { returnUrl } = portalSessionSchema.parse(body)

  // Get user with Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stripeCustomerId: true
    }
  })

  if (!user || !user.stripeCustomerId) {
    throw createError({
      statusCode: 400,
      message: 'No Stripe customer found. Please subscribe first.'
    })
  }

  const config = useRuntimeConfig()
  const baseUrl = config.public.siteUrl || 'http://localhost:3099'

  let portalSession
  try {
    portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl || `${baseUrl}/settings/billing`
    })
  } catch (error: any) {
    if (error?.type !== 'StripeInvalidRequestError' && error?.code !== 'resource_missing') {
      throw error
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionTier: 'FREE',
        subscriptionStatus: 'NONE',
        subscriptionPeriodEnd: null,
        pendingSubscriptionTier: null,
        pendingSubscriptionPeriodEnd: null
      }
    })

    throw createError({
      statusCode: 409,
      message:
        'Billing profile not found in the current Stripe account. Please choose a plan again to start a fresh checkout.'
    })
  }

  return {
    url: portalSession.url
  }
})
