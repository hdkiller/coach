import type { BillingInterval, PricingPlan, SupportedCurrency } from '~/utils/pricing'
import { calculateAnnualSavings, computeSavingsPercent, getPrice } from '~/utils/pricing'

type StripePriceInfo = {
  tier: 'supporter' | 'pro'
  interval: BillingInterval
  currency: SupportedCurrency
  amount: number
  priceId: string
}

/**
 * Prices as Stripe actually bills them, with the bundled constants as fallback.
 *
 * Every price and savings figure shown to an athlete should come from here:
 * hardcoded numbers drift from Stripe, and the same figure re-formatted in
 * another currency is simply wrong when the EUR price object differs.
 */
export function useLivePricing() {
  const { data } = useAsyncData<{ prices: StripePriceInfo[] }>(
    'stripe-prices',
    () => ($fetch as any)('/api/stripe/prices'),
    { lazy: true, default: () => ({ prices: [] }) }
  )

  function findPrice(
    plan: PricingPlan,
    interval: BillingInterval,
    currency: SupportedCurrency
  ): number | null {
    if (plan.key === 'free') return 0
    const match = data.value?.prices?.find(
      (price: StripePriceInfo) =>
        price.tier === plan.key && price.interval === interval && price.currency === currency
    )
    return match ? match.amount : null
  }

  /** Live amount when Stripe answered, otherwise the bundled constant. */
  function priceFor(
    plan: PricingPlan,
    interval: BillingInterval,
    currency: SupportedCurrency
  ): number {
    return findPrice(plan, interval, currency) ?? getPrice(plan, interval)
  }

  function monthlyEquivalent(plan: PricingPlan, currency: SupportedCurrency): number {
    return priceFor(plan, 'annual', currency) / 12
  }

  /**
   * Real annual saving for this plan, or null when there is nothing to compare
   * against — never claim a discount that isn't in the prices.
   */
  function annualSavings(plan: PricingPlan, currency: SupportedCurrency): number | null {
    const monthly = findPrice(plan, 'monthly', currency)
    const annual = findPrice(plan, 'annual', currency)
    if (monthly === null || annual === null) {
      const fallback = calculateAnnualSavings(plan)
      return fallback > 0 ? fallback : null
    }
    return computeSavingsPercent(monthly, annual)
  }

  /** Best saving across paid plans — for the Monthly/Annual toggle badge. */
  function bestAnnualSavings(plans: PricingPlan[], currency: SupportedCurrency): number | null {
    const savings = plans
      .filter((plan) => plan.key !== 'free')
      .map((plan) => annualSavings(plan, currency))
      .filter((value): value is number => value !== null)
    return savings.length > 0 ? Math.max(...savings) : null
  }

  return { priceFor, monthlyEquivalent, annualSavings, bestAnnualSavings }
}
