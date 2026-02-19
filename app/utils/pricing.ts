export type BillingInterval = 'monthly' | 'annual'
export type PricingTier = 'free' | 'supporter' | 'pro'

export interface PricingPlan {
  key: PricingTier
  name: string
  monthlyPrice: number
  annualPrice: number | null
  description: string
  mobileDescription?: string
  features: string[]
  popular: boolean
  stripePriceIds?: {
    monthly?: string
    annual?: string
  }
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    key: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: null,
    description: "The smartest logbook you've ever used.",
    mobileDescription: 'Essential activity tracking and analysis.',
    features: [
      'Unlimited data history',
      'Manual sync mode',
      'On-demand analysis',
      'Quick AI analysis'
    ],
    popular: false
  },
  {
    key: 'supporter',
    name: 'Supporter',
    monthlyPrice: 8.99,
    annualPrice: 89.99,
    description: 'Automated insights for the self-coached athlete.',
    mobileDescription: 'Automated insights and reliable sync.',
    features: [
      'Automatic sync for workouts and health metrics',
      'Always-on AI analysis after new activities',
      'Priority processing during peak usage',
      'Reliable trend tracking and weekly summaries'
    ],
    popular: true
  },
  {
    key: 'pro',
    name: 'Pro',
    monthlyPrice: 14.99,
    annualPrice: 119.0,
    description: 'Your full-service Digital Twin and Coach.',
    mobileDescription: 'Adaptive planning and elite AI coaching.',
    features: [
      'Adaptive race strategy and periodized planning',
      'Thoughtful AI coaching with scenario analysis',
      'Proactive alerts for readiness and overreaching risk',
      'Advanced trend intelligence with long-horizon forecasting',
      'Fast-lane priority processing and response'
    ],
    popular: false
  }
]

/**
 * Calculate savings percentage for annual plans
 */
export function calculateAnnualSavings(plan: PricingPlan): number {
  if (!plan.annualPrice) return 0
  const monthlyTotal = plan.monthlyPrice * 12
  const savings = ((monthlyTotal - plan.annualPrice) / monthlyTotal) * 100
  return Math.round(savings)
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: 'usd' | 'eur' = 'usd'): string {
  const locale = currency === 'eur' ? 'de-DE' : 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: price % 1 === 0 ? 0 : 2
  }).format(price)
}

/**
 * Get price for a specific interval
 */
export function getPrice(plan: PricingPlan, interval: BillingInterval): number {
  return interval === 'annual' && plan.annualPrice ? plan.annualPrice : plan.monthlyPrice
}

/**
 * Get Stripe price ID for a plan, interval, and currency
 */
export function getStripePriceId(
  plan: PricingPlan,
  interval: BillingInterval,
  currency: 'usd' | 'eur' = 'usd'
): string | undefined {
  const config = useRuntimeConfig()
  const eur = currency === 'eur'

  if (plan.key === 'supporter') {
    if (interval === 'monthly') {
      return eur
        ? config.public.stripeSupporterMonthlyEurPriceId
        : config.public.stripeSupporterMonthlyPriceId
    }
    return eur
      ? config.public.stripeSupporterAnnualEurPriceId
      : config.public.stripeSupporterAnnualPriceId
  }

  if (plan.key === 'pro') {
    if (interval === 'monthly') {
      return eur ? config.public.stripeProMonthlyEurPriceId : config.public.stripeProMonthlyPriceId
    }
    return eur ? config.public.stripeProAnnualEurPriceId : config.public.stripeProAnnualPriceId
  }

  return undefined
}
