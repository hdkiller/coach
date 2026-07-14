import { requireAuth } from '../../../utils/auth-guard'
import { redeemPartnerCampaign } from '../../../utils/partner-campaigns'
import { checkRateLimit, getRateLimitKeyFromEvent } from '../../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, message: 'Campaign slug is required' })
  }

  const rateLimit = checkRateLimit('partner-campaign-redeem', `${user.id}:${slug}`, {
    windowMs: 60_000,
    maxAttempts: 5,
    minIntervalMs: 1_000
  })

  if (!rateLimit.allowed) {
    throw createError({
      statusCode: 429,
      message: 'Too many redemption attempts. Please wait and try again.'
    })
  }

  const ipKey = getRateLimitKeyFromEvent({
    headers: {
      'x-forwarded-for': getHeader(event, 'x-forwarded-for') || undefined
    }
  })
  const ipRateLimit = checkRateLimit('partner-campaign-redeem-ip', `${ipKey}:${slug}`, {
    windowMs: 60_000,
    maxAttempts: 20,
    minIntervalMs: 0
  })

  if (!ipRateLimit.allowed) {
    throw createError({
      statusCode: 429,
      message: 'Too many redemption attempts from this network. Please try again later.'
    })
  }

  return redeemPartnerCampaign(user.id, slug)
})
