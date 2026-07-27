import { createError, setHeader, type H3Event } from 'h3'
import { checkQuota } from './engine'
import { quotaFeatureCode } from './registry'
import type { QuotaStatus } from '~~/app/types/quotas'

/**
 * Publish the athlete's standing on this operation.
 *
 * Clients previously learned a limit existed only by being blocked, after
 * waiting through a generation. These headers ride along with the success
 * response so a caller can warn ("2 analyses left") before the allowance runs
 * out, without a second round trip.
 */
export function setQuotaHeaders(event: H3Event, status: QuotaStatus): void {
  const feature = quotaFeatureCode(status.operation)
  if (feature) setHeader(event, 'X-Quota-Feature', feature)
  setHeader(event, 'X-Quota-Operation', status.operation)
  setHeader(event, 'X-Quota-Limit', String(status.limit))
  setHeader(event, 'X-Quota-Used', String(status.used))
  setHeader(event, 'X-Quota-Remaining', String(status.remaining))
  if (status.resetsAt) {
    const reset =
      status.resetsAt instanceof Date ? status.resetsAt.toISOString() : String(status.resetsAt)
    setHeader(event, 'X-Quota-Reset', reset)
  }
}

/**
 * Enforce a quota for an operation, turning a denial into a 429 that carries the
 * full limit contract (`code`, `feature`, `limit`, `used`, `resetsAt`,
 * `requiredTier`) plus a `Retry-After` header.
 *
 * On success the same numbers go out as `X-Quota-*` headers.
 *
 * Pass `event` wherever it is available: without it the body still describes the
 * limit, but clients lose both the retry hint and the remaining-allowance hint.
 */
export async function assertQuotaAllowed(
  userId: string,
  operation: string,
  fallbackMessage?: string,
  event?: H3Event
) {
  try {
    const status = await checkQuota(userId, operation)
    // `limit` is Infinity when no quota is defined — nothing useful to publish.
    if (event && Number.isFinite(status.limit)) {
      setQuotaHeaders(event, status)
    }
    return status
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
