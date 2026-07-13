import { createError } from 'h3'
import { prisma } from './db'
import { stripe } from './stripe'

type BillingUser = {
  id: string
  email: string
  name?: string | null
  stripeCustomerId?: string | null
}

type EnsureStripeCustomerResult = {
  customerId: string
  source: 'existing' | 'reattached' | 'created'
}

type EnsureStripeCustomerOptions = {
  createIfMissing?: boolean
}

function isRecoverableStripeCustomerError(error: any) {
  return error?.type === 'StripeInvalidRequestError' || error?.code === 'resource_missing'
}

async function listCandidateCustomersByEmail(email: string) {
  const customers = await stripe.customers.list({
    email,
    limit: 10
  })

  const scoredCustomers = await Promise.all(
    customers.data
      .filter((customer) => !customer.deleted)
      .map(async (customer) => {
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'all',
          limit: 20
        })

        const hasRecoverableSubscription = subscriptions.data.some((subscription) =>
          ['active', 'trialing', 'past_due', 'incomplete', 'unpaid'].includes(subscription.status)
        )

        return {
          customer,
          hasRecoverableSubscription
        }
      })
  )

  scoredCustomers.sort((left, right) => {
    if (left.hasRecoverableSubscription !== right.hasRecoverableSubscription) {
      return left.hasRecoverableSubscription ? -1 : 1
    }

    return right.customer.created - left.customer.created
  })

  return scoredCustomers.map((entry) => entry.customer)
}

export async function ensureStripeCustomerForUser(
  user: BillingUser,
  options: EnsureStripeCustomerOptions = {}
): Promise<EnsureStripeCustomerResult> {
  const { createIfMissing = true } = options
  let customerId = user.stripeCustomerId ?? null

  if (customerId) {
    try {
      await stripe.customers.retrieve(customerId)
      return {
        customerId,
        source: 'existing'
      }
    } catch (error: any) {
      if (!isRecoverableStripeCustomerError(error)) {
        throw error
      }

      await prisma.user.update({
        where: { id: user.id },
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
    }
  }

  const existingCustomer = (await listCandidateCustomersByEmail(user.email))[0]

  if (existingCustomer) {
    customerId = existingCustomer.id

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId }
    })

    try {
      await stripe.customers.update(customerId, {
        email: user.email,
        name: user.name || undefined,
        metadata: {
          ...(existingCustomer.metadata || {}),
          userId: user.id
        }
      })
    } catch (error) {
      console.warn('Failed to update Stripe customer metadata during reattach', {
        userId: user.id,
        customerId,
        error
      })
    }

    return {
      customerId,
      source: 'reattached'
    }
  }

  if (!createIfMissing) {
    throw createError({
      statusCode: 404,
      message: 'No Stripe customer found for this user'
    })
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: {
      userId: user.id
    }
  })

  customerId = customer.id

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customerId }
  })

  return {
    customerId,
    source: 'created'
  }
}
