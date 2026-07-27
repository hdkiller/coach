import { requireAuth } from '../../utils/auth-guard'
import { getQuotaSummary } from '../../utils/quotas/engine'
import {
  getNextTier,
  quotaFeatureCode,
  resolveUpgradeForOperation
} from '../../utils/quotas/registry'
import type { SubscriptionTier } from '@prisma/client'
import type { QuotaStatus } from '~~/app/types/quotas'

function resolveEffectiveTier(user: {
  subscriptionTier: SubscriptionTier
  trialEndsAt: Date | null
}): SubscriptionTier {
  const isTrialActive = user.trialEndsAt && new Date(user.trialEndsAt) > new Date()
  return user.subscriptionTier === 'FREE' && isTrialActive ? 'SUPPORTER' : user.subscriptionTier
}

function enrichQuotasWithNextTier(
  quotas: QuotaStatus[],
  effectiveTier: SubscriptionTier
): QuotaStatus[] {
  const nextTier = getNextTier(effectiveTier)
  if (!nextTier) return quotas

  return quotas.map((quota) => {
    // Only surface an upgrade that actually raises this operation's limit.
    const upgrade = resolveUpgradeForOperation(quota.operation, effectiveTier)
    return {
      ...quota,
      // Same feature codes the 429 payload uses, so clients keep one mapping.
      feature: quotaFeatureCode(quota.operation),
      nextTier: upgrade?.nextTier ?? nextTier,
      nextTierLimit: upgrade?.nextTierLimit ?? null
    }
  })
}

defineRouteMeta({
  openAPI: {
    tags: ['Profile'],
    summary: 'Get user LLM quotas',
    description:
      'Returns the current usage and limits for LLM operations based on the user subscription tier.',
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                tier: { type: 'string' },
                quotas: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      operation: { type: 'string' },
                      allowed: { type: 'boolean' },
                      used: { type: 'integer' },
                      limit: { type: 'integer' },
                      remaining: { type: 'integer' },
                      window: { type: 'string' },
                      resetsAt: { type: 'string', format: 'date-time' },
                      enforcement: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  // Session-only auth kept this endpoint unreachable from the mobile app, which
  // authenticates with an OAuth bearer token — so the app had no way to warn an
  // athlete before an allowance ran out.
  const authUser = await requireAuth(event, ['profile:read'])
  const userId = authUser.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, trialEndsAt: true }
  })

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const quotas = await getQuotaSummary(userId)
  const effectiveTier = resolveEffectiveTier(user)
  const enrichedQuotas = enrichQuotasWithNextTier(quotas, effectiveTier)
  const isTrialActive = Boolean(user.trialEndsAt && new Date(user.trialEndsAt) > new Date())

  return {
    tier: user.subscriptionTier,
    trialEndsAt: user.trialEndsAt,
    isTrialActive,
    showQuotaMeter: user.subscriptionTier === 'FREE',
    effectiveTier,
    quotas: enrichedQuotas
  }
})
