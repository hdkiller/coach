import type { H3Event } from 'h3'
import { checkRateLimit, getRateLimitKeyFromEvent } from './rate-limit'

const REDEMPTION_WINDOW_MS = 60 * 1000
const REDEMPTION_MAX_ATTEMPTS = 10
const REDEMPTION_MIN_INTERVAL_MS = 1000

export function enforceInviteRedemptionRateLimit(event: H3Event, userId: string) {
  const ip = getRateLimitKeyFromEvent({
    headers: {
      'x-forwarded-for': getHeader(event, 'x-forwarded-for') || undefined
    }
  })

  const ipResult = checkRateLimit('invite-redemption-ip', ip, {
    windowMs: REDEMPTION_WINDOW_MS,
    maxAttempts: REDEMPTION_MAX_ATTEMPTS,
    minIntervalMs: REDEMPTION_MIN_INTERVAL_MS
  })

  if (!ipResult.allowed) {
    throw createError({
      statusCode: 429,
      message: 'Too many invite attempts. Please try again shortly.'
    })
  }

  const accountResult = checkRateLimit('invite-redemption-account', userId, {
    windowMs: REDEMPTION_WINDOW_MS,
    maxAttempts: REDEMPTION_MAX_ATTEMPTS,
    minIntervalMs: REDEMPTION_MIN_INTERVAL_MS
  })

  if (!accountResult.allowed) {
    throw createError({
      statusCode: 429,
      message: 'Too many invite attempts. Please try again shortly.'
    })
  }
}
