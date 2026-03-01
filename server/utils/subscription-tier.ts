import type Stripe from 'stripe'
import type { SubscriptionTier } from '@prisma/client'

type StripeTierConfig = {
  stripeSupporterProductId?: string
  stripeSupporterMonthlyPriceId?: string
  stripeSupporterAnnualPriceId?: string
  stripeSupporterMonthlyEurPriceId?: string
  stripeSupporterAnnualEurPriceId?: string
  stripeProProductId?: string
  stripeProMonthlyPriceId?: string
  stripeProAnnualPriceId?: string
  stripeProMonthlyEurPriceId?: string
  stripeProAnnualEurPriceId?: string
}

export function getPriceProductId(priceProduct: Stripe.Price['product']): string | null {
  if (!priceProduct) return null
  return typeof priceProduct === 'string' ? priceProduct : priceProduct.id
}

function inferTierFromText(value?: string | null): SubscriptionTier | null {
  if (!value) return null

  const normalized = value.trim().toLowerCase()
  if (!normalized) return null

  if (normalized.includes('supporter')) return 'SUPPORTER'
  if (normalized === 'pro' || normalized.includes(' pro')) return 'PRO'

  return null
}

function inferTierFromProduct(product: Stripe.Product | null): SubscriptionTier | null {
  if (!product) return null

  return (
    inferTierFromText(product.metadata?.tier) ||
    inferTierFromText(product.name) ||
    inferTierFromText(product.description)
  )
}

export async function resolveSubscriptionTier(
  item: Stripe.SubscriptionItem | undefined,
  config: StripeTierConfig,
  stripeClient: Stripe
): Promise<SubscriptionTier> {
  const price = item?.price
  const priceId = price?.id
  const productId = getPriceProductId((price?.product as Stripe.Price['product']) ?? null)

  const supporterPriceIds = [
    config.stripeSupporterMonthlyPriceId,
    config.stripeSupporterAnnualPriceId,
    config.stripeSupporterMonthlyEurPriceId,
    config.stripeSupporterAnnualEurPriceId
  ].filter(Boolean)
  const proPriceIds = [
    config.stripeProMonthlyPriceId,
    config.stripeProAnnualPriceId,
    config.stripeProMonthlyEurPriceId,
    config.stripeProAnnualEurPriceId
  ].filter(Boolean)

  if (priceId && supporterPriceIds.includes(priceId)) return 'SUPPORTER'
  if (priceId && proPriceIds.includes(priceId)) return 'PRO'
  if (productId && productId === config.stripeSupporterProductId) return 'SUPPORTER'
  if (productId && productId === config.stripeProProductId) return 'PRO'

  const inlineProduct =
    price?.product && typeof price.product !== 'string' ? (price.product as Stripe.Product) : null

  const inferredInlineTier =
    inferTierFromText(price?.lookup_key) ||
    inferTierFromText(price?.nickname) ||
    inferTierFromProduct(inlineProduct)

  if (inferredInlineTier) {
    return inferredInlineTier
  }

  if (productId) {
    const product = await stripeClient.products.retrieve(productId)
    const inferredProductTier = inferTierFromProduct(product)
    if (inferredProductTier) {
      return inferredProductTier
    }
  }

  throw new Error(
    `Unable to resolve subscription tier for price '${priceId || 'unknown'}' product '${productId || 'unknown'}'`
  )
}
