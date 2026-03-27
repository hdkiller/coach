import { Prisma } from '@prisma/client'
import { prisma } from '../db'
import type { QuotaOperation } from './registry'
import { QUOTA_REGISTRY, mapOperationToQuota } from './registry'
import type { SubscriptionTier, User } from '@prisma/client'
import type { QuotaStatus } from '~~/app/types/quotas'
import { getUserTimezone, getStartOfDayUTC, getEndOfDayUTC } from '../date'

/**
 * Get current usage and limit status for a user and operation
 */
export async function getQuotaStatus(
  userId: string,
  operation: string
): Promise<QuotaStatus | null> {
  try {
    const canonicalOp = mapOperationToQuota(operation)
    if (!canonicalOp) return null

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, trialEndsAt: true, timezone: true }
    })

    if (!user) return null

    // Trial Logic: If user is FREE but has an active trial, they get SUPPORTER quotas
    const isTrialActive = user.trialEndsAt && new Date(user.trialEndsAt) > new Date()
    const effectiveTier: SubscriptionTier =
      user.subscriptionTier === 'FREE' && isTrialActive ? 'SUPPORTER' : user.subscriptionTier

    const quotaDef = QUOTA_REGISTRY[effectiveTier][canonicalOp]

    if (!quotaDef) return null

    const timezone = user.timezone || 'UTC'
    const isCalendarReset = quotaDef.resetType === 'CALENDAR'

    // Calculate usage within the window
    let usageCount: any[]

    if (isCalendarReset) {
      const startOfToday = getStartOfDayUTC(timezone)
      usageCount = await prisma.$queryRaw`
        SELECT COUNT(*)::int as count, MIN("createdAt") as "firstUsedAt"
        FROM "LlmUsage"
        WHERE "userId" = ${userId}
          AND "operation" = ${operation}
          AND "success" = true
          AND "counted" = true
          AND "createdAt" >= ${startOfToday}
      `
    } else {
      usageCount = await prisma.$queryRaw`
        SELECT COUNT(*)::int as count, MIN("createdAt") as "firstUsedAt"
        FROM "LlmUsage"
        WHERE "userId" = ${userId}
          AND "operation" = ${operation}
          AND "success" = true
          AND "counted" = true
          AND "createdAt" >= NOW() - CAST(${quotaDef.window} AS interval)
      `
    }

    const used = usageCount[0]?.count || 0
    const remaining = Math.max(0, quotaDef.limit - used)

    // Estimate reset time
    let resetsAt = null
    if (isCalendarReset) {
      // For calendar reset, it resets at midnight tonight in user's timezone
      resetsAt = getEndOfDayUTC(timezone)
    } else if (used > 0 && usageCount[0]?.firstUsedAt) {
      const firstUsedAt = new Date(usageCount[0].firstUsedAt)
      resetsAt = new Date(firstUsedAt.getTime() + parseIntervalToMs(quotaDef.window))
    }

    return {
      operation,
      allowed: quotaDef.enforcement === 'MEASURE' || used < quotaDef.limit,
      used,
      limit: quotaDef.limit,
      remaining,
      window: isCalendarReset ? 'calendar day' : quotaDef.window,
      resetsAt,
      enforcement: quotaDef.enforcement
    }
  } catch (error) {
    console.error(`Failed to get quota status for ${operation}:`, error)
    // Return a dummy "allowed" status on error so we don't break the app
    return {
      operation,
      allowed: true,
      used: 0,
      limit: 0,
      remaining: 0,
      window: 'error',
      resetsAt: null,
      enforcement: 'MEASURE'
    }
  }
}

/**
 * Check if a user is allowed to perform an operation and throw if not
 */
export async function checkQuota(userId: string, operation: string): Promise<QuotaStatus> {
  const status = await getQuotaStatus(userId, operation)

  if (!status) {
    // If no quota defined, we allow it but log it
    return {
      operation,
      allowed: true,
      used: 0,
      limit: Infinity,
      remaining: Infinity,
      window: 'none',
      resetsAt: null,
      enforcement: 'MEASURE'
    }
  }

  if (!status.allowed && status.enforcement === 'STRICT') {
    const error = new Error(
      `Quota exceeded for ${operation}. Upgrade your plan for higher limits.`
    ) as Error & {
      statusCode?: number
      statusMessage?: string
      data?: Record<string, unknown>
      quotaExceeded?: boolean
    }
    error.statusCode = 429
    error.statusMessage = `Quota exceeded for ${operation}. Upgrade your plan for higher limits.`
    error.data = {
      operation,
      quotaExceeded: true
    }
    error.quotaExceeded = true
    throw error
  }

  return status
}

/**
 * Helper to convert PG interval strings to ms (basic support)
 */
function parseIntervalToMs(interval: string): number {
  const parts = interval.split(' ')
  if (parts.length < 2) return 0
  const value = parseInt(parts[0] || '0')
  const unit = (parts[1] || '').toLowerCase()

  if (unit.includes('hour')) return value * 60 * 60 * 1000
  if (unit.includes('day')) return value * 24 * 60 * 60 * 1000
  if (unit.includes('week')) return value * 7 * 24 * 60 * 60 * 1000
  if (unit.includes('month')) return value * 30 * 24 * 60 * 60 * 1000

  return value * 60 * 1000 // default to minutes
}

/**
 * Get all quota statuses for a user
 */
export async function getQuotaSummary(userId: string): Promise<QuotaStatus[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, trialEndsAt: true }
    })

    if (!user) return []

    const isTrialActive = user.trialEndsAt && new Date(user.trialEndsAt) > new Date()
    const effectiveTier: SubscriptionTier =
      user.subscriptionTier === 'FREE' && isTrialActive ? 'SUPPORTER' : user.subscriptionTier

    const ops = Object.keys(QUOTA_REGISTRY[effectiveTier]) as QuotaOperation[]

    // Use a race to ensure we don't hang forever if DB is slow
    const results = await promiseTimeout(
      Promise.all(ops.map((op) => getQuotaStatus(userId, op))),
      5000 // 5 second timeout for summary
    )

    return (results || []).filter((r): r is QuotaStatus => r !== null)
  } catch (err) {
    console.error('getQuotaSummary failed:', err)
    return []
  }
}

function promiseTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Quota summary request timed out')), ms)
  })
  return Promise.race([promise, timeout])
}
