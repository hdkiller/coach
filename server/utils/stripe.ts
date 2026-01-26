import Stripe from 'stripe'

const config = useRuntimeConfig()

if (!config.stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables')
}

export const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2025-12-15.clover',
  typescript: true
})

/**
 * Get Stripe price IDs from environment
 */
export function getStripePriceIds() {
  return {
    supporter: {
      monthly: config.stripeSupporterMonthlyPriceId,
      annual: config.stripeSupporterAnnualPriceId
    },
    pro: {
      monthly: config.stripeProMonthlyPriceId,
      annual: config.stripeProAnnualPriceId
    }
  }
}

/**
 * Get Stripe product IDs from environment
 */
export function getStripeProductIds() {
  return {
    supporter: config.stripeSupporterProductId,
    pro: config.stripeProProductId
  }
}
