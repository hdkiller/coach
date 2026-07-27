import { stripe } from '../../utils/stripe'

type PriceKey = {
  tier: 'supporter' | 'pro'
  interval: 'monthly' | 'annual'
  currency: 'usd' | 'eur'
  configKey: string
}

export type StripePriceInfo = {
  tier: 'supporter' | 'pro'
  interval: 'monthly' | 'annual'
  currency: 'usd' | 'eur'
  /** Major units (9.99), so the client never does cent maths. */
  amount: number
  priceId: string
}

function priceKeys(config: Record<string, unknown>): PriceKey[] {
  const keys: PriceKey[] = [
    {
      tier: 'supporter',
      interval: 'monthly',
      currency: 'usd',
      configKey: 'stripeSupporterMonthlyPriceId'
    },
    {
      tier: 'supporter',
      interval: 'annual',
      currency: 'usd',
      configKey: 'stripeSupporterAnnualPriceId'
    },
    {
      tier: 'supporter',
      interval: 'monthly',
      currency: 'eur',
      configKey: 'stripeSupporterMonthlyEurPriceId'
    },
    {
      tier: 'supporter',
      interval: 'annual',
      currency: 'eur',
      configKey: 'stripeSupporterAnnualEurPriceId'
    },
    { tier: 'pro', interval: 'monthly', currency: 'usd', configKey: 'stripeProMonthlyPriceId' },
    { tier: 'pro', interval: 'annual', currency: 'usd', configKey: 'stripeProAnnualPriceId' },
    { tier: 'pro', interval: 'monthly', currency: 'eur', configKey: 'stripeProMonthlyEurPriceId' },
    { tier: 'pro', interval: 'annual', currency: 'eur', configKey: 'stripeProAnnualEurPriceId' }
  ]

  return keys.filter((key) => typeof config[key.configKey] === 'string' && config[key.configKey])
}

/**
 * Live price amounts for the configured Stripe price IDs.
 *
 * The pricing UI used to render hardcoded numbers and re-format the *same* USD
 * figure as EUR, so a mismatch between the constants and Stripe (or between the
 * USD and EUR price objects) would show one price and charge another. Reading
 * the amounts from Stripe keeps the page and the invoice in agreement, and lets
 * savings badges be computed instead of asserted.
 *
 * Cached for an hour: prices change rarely and this is on the public landing.
 */
export default defineCachedEventHandler(
  async (): Promise<{ prices: StripePriceInfo[] }> => {
    const config = useRuntimeConfig()
    const keys = priceKeys(config.public as unknown as Record<string, unknown>)

    const prices = await Promise.all(
      keys.map(async (key): Promise<StripePriceInfo | null> => {
        const priceId = (config.public as unknown as Record<string, string>)[key.configKey]!
        try {
          const price = await stripe.prices.retrieve(priceId)
          if (price.unit_amount == null) return null
          return {
            tier: key.tier,
            interval: key.interval,
            currency: key.currency,
            amount: price.unit_amount / 100,
            priceId
          }
        } catch (error) {
          // A missing or mistyped price id must not take the pricing page down;
          // the client falls back to its bundled constants.
          console.error(`[stripe] Failed to load price ${key.configKey} (${priceId})`, error)
          return null
        }
      })
    )

    return { prices: prices.filter((price): price is StripePriceInfo => price !== null) }
  },
  { maxAge: 60 * 60, name: 'stripe-prices', getKey: () => 'all' }
)
