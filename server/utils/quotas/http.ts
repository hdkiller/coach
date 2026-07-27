import { createError, setHeader, type H3Event } from 'h3'
import { checkQuota } from './engine'

/**
 * Enforce a quota for an operation, turning a denial into a 429 that carries the
 * full limit contract (`code`, `feature`, `limit`, `used`, `resetsAt`,
 * `requiredTier`) plus a `Retry-After` header.
 *
 * Pass `event` wherever it is available: without it the body still describes the
 * limit, but clients lose the transport-level retry hint.
 */
export async function assertQuotaAllowed(
  userId: string,
  operation: string,
  fallbackMessage?: string,
  event?: H3Event
) {
  try {
    await checkQuota(userId, operation)
  } catch (error: any) {
    if (error?.statusCode === 429) {
      const retryAfter = error.data?.retryAfterSeconds
      if (event && typeof retryAfter === 'number' && retryAfter > 0) {
        setHeader(event, 'Retry-After', retryAfter)
      }

      throw createError({
        statusCode: 429,
        statusMessage: error.statusMessage || error.message || fallbackMessage,
        message: error.message || fallbackMessage || 'Quota exceeded.',
        data: error.data
      })
    }

    throw error
  }
}
