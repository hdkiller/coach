import { getServerSession } from '../../utils/session'
import { prisma } from '../../utils/db'
import { stripe } from '../../utils/stripe'

export type CurrentSubscriptionInfo = {
  priceId: string | null
  interval: 'monthly' | 'annual' | null
  /** Major units, matching what the pricing UI renders. */
  amount: number | null
  currency: string | null
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  status: string | null
}

const EMPTY: CurrentSubscriptionInfo = {
  priceId: null,
  interval: null,
  amount: null,
  currency: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  status: null
}

/**
 * What the athlete is actually being billed, straight from Stripe.
 *
 * The User record stores no price id, so the UI could not tell monthly from
 * annual — which is why the plan grid disabled the annual card as "current
 * plan" for monthly subscribers, and why the billing page could show a renewal
 * date but never an amount.
 */
export default defineEventHandler(async (event): Promise<CurrentSubscriptionInfo> => {
  const session = await getServerSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeSubscriptionId: true }
  })

  if (!user?.stripeSubscriptionId) return EMPTY

  try {
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
    const item = subscription.items.data[0]
    const price = item?.price
    if (!price) return EMPTY

    const recurring = price.recurring
    const interval =
      recurring?.interval === 'year'
        ? 'annual'
        : recurring?.interval === 'month'
          ? 'monthly'
          : null
    const periodEnd = item?.current_period_end ?? null

    return {
      priceId: price.id,
      interval,
      amount: price.unit_amount == null ? null : price.unit_amount / 100,
      currency: price.currency ?? null,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      status: subscription.status ?? null
    }
  } catch (error) {
    // A stale subscription id must not break the billing page.
    console.error('[stripe] Failed to load current subscription', error)
    return EMPTY
  }
})
