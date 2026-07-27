import type { SubscriptionTier } from '@prisma/client'

export type QuotaOperation =
  | 'chat'
  | 'workout_analysis'
  | 'athlete_profile_generation'
  | 'goal_suggestions'
  | 'goal_review'
  | 'weekly_plan_generation'
  | 'nutrition_analysis'
  | 'daily_checkin'
  | 'custom_report_generation'
  | 'unified_report_generation'
  | 'activity_recommendation'
  | 'meal_recommendation'
  | 'generate_structured_workout'
  | 'wellness_analysis'

export type EnforcementType = 'STRICT' | 'MEASURE'
export type ResetType = 'ROLLING' | 'CALENDAR'

export interface QuotaDefinition {
  limit: number
  window: string // postgres interval string: '4 hours', '7 days', etc.
  enforcement: EnforcementType
  resetType?: ResetType
}

export const QUOTA_REGISTRY: Record<
  SubscriptionTier,
  Partial<Record<QuotaOperation, QuotaDefinition>>
> = {
  FREE: {
    chat: { limit: 5, window: '4 hours', enforcement: 'STRICT' },
    workout_analysis: { limit: 6, window: '7 days', enforcement: 'STRICT' },
    athlete_profile_generation: { limit: 1, window: '24 hours', enforcement: 'STRICT' },
    goal_suggestions: { limit: 1, window: '24 hours', enforcement: 'STRICT' },
    goal_review: { limit: 1, window: '24 hours', enforcement: 'STRICT' },
    daily_checkin: { limit: 1, window: '1 day', enforcement: 'STRICT', resetType: 'CALENDAR' },
    unified_report_generation: { limit: 1, window: '30 days', enforcement: 'STRICT' },
    nutrition_analysis: { limit: 3, window: '7 days', enforcement: 'STRICT' },
    activity_recommendation: {
      limit: 2,
      window: '1 day',
      enforcement: 'STRICT',
      resetType: 'CALENDAR'
    },
    meal_recommendation: { limit: 3, window: '24 hours', enforcement: 'STRICT' },
    generate_structured_workout: { limit: 5, window: '7 days', enforcement: 'STRICT' },
    wellness_analysis: { limit: 3, window: '7 days', enforcement: 'STRICT' },
    custom_report_generation: { limit: 1, window: '30 days', enforcement: 'STRICT' },
    weekly_plan_generation: { limit: 1, window: '7 days', enforcement: 'STRICT' }
  },
  SUPPORTER: {
    chat: { limit: 50, window: '4 hours', enforcement: 'STRICT' },
    workout_analysis: { limit: 30, window: '7 days', enforcement: 'STRICT' },
    athlete_profile_generation: { limit: 5, window: '24 hours', enforcement: 'STRICT' },
    goal_suggestions: { limit: 5, window: '24 hours', enforcement: 'STRICT' },
    goal_review: { limit: 5, window: '24 hours', enforcement: 'STRICT' },
    daily_checkin: { limit: 2, window: '1 day', enforcement: 'STRICT', resetType: 'CALENDAR' },
    unified_report_generation: { limit: 5, window: '30 days', enforcement: 'STRICT' },
    nutrition_analysis: { limit: 20, window: '7 days', enforcement: 'STRICT' },
    activity_recommendation: {
      limit: 5,
      window: '1 day',
      enforcement: 'STRICT',
      resetType: 'CALENDAR'
    },
    meal_recommendation: { limit: 10, window: '24 hours', enforcement: 'STRICT' },
    generate_structured_workout: { limit: 20, window: '7 days', enforcement: 'STRICT' },
    wellness_analysis: { limit: 20, window: '7 days', enforcement: 'STRICT' },
    custom_report_generation: { limit: 5, window: '30 days', enforcement: 'STRICT' },
    weekly_plan_generation: { limit: 2, window: '7 days', enforcement: 'STRICT' }
  },
  PRO: {
    chat: { limit: 500, window: '4 hours', enforcement: 'STRICT' },
    workout_analysis: { limit: 150, window: '7 days', enforcement: 'STRICT' },
    athlete_profile_generation: { limit: 20, window: '24 hours', enforcement: 'STRICT' },
    goal_suggestions: { limit: 20, window: '24 hours', enforcement: 'STRICT' },
    goal_review: { limit: 20, window: '24 hours', enforcement: 'STRICT' },
    daily_checkin: { limit: 5, window: '1 day', enforcement: 'STRICT', resetType: 'CALENDAR' },
    unified_report_generation: { limit: 20, window: '30 days', enforcement: 'STRICT' },
    nutrition_analysis: { limit: 100, window: '7 days', enforcement: 'STRICT' },
    activity_recommendation: {
      limit: 20,
      window: '1 day',
      enforcement: 'STRICT',
      resetType: 'CALENDAR'
    },
    meal_recommendation: { limit: 50, window: '24 hours', enforcement: 'STRICT' },
    generate_structured_workout: { limit: 250, window: '7 days', enforcement: 'STRICT' },
    wellness_analysis: { limit: 100, window: '7 days', enforcement: 'STRICT' },
    custom_report_generation: { limit: 20, window: '30 days', enforcement: 'STRICT' },
    weekly_plan_generation: { limit: 5, window: '7 days', enforcement: 'STRICT' }
  }
}

/**
 * Maps legacy or variations of operation names to the canonical QuotaOperation
 */
export function mapOperationToQuota(operation: string): QuotaOperation | null {
  const map: Record<string, QuotaOperation> = {
    chat_ws: 'chat',
    chat_title_generation: 'chat',
    last_3_workouts_analysis: 'workout_analysis',
    weekly_report_generation: 'unified_report_generation',
    last_3_nutrition_analysis: 'nutrition_analysis',
    last_7_nutrition_analysis: 'nutrition_analysis'
  }

  if (map[operation]) return map[operation]

  // Check if it's already a valid QuotaOperation
  const validOps: string[] = [
    'chat',
    'workout_analysis',
    'athlete_profile_generation',
    'goal_suggestions',
    'goal_review',
    'weekly_plan_generation',
    'nutrition_analysis',
    'daily_checkin',
    'custom_report_generation',
    'unified_report_generation',
    'activity_recommendation',
    'meal_recommendation',
    'generate_structured_workout',
    'wellness_analysis'
  ]

  if (validOps.includes(operation)) return operation as QuotaOperation

  return null
}

/**
 * Feature codes shared with API clients (mobile app, MCP) so a 429 identifies
 * *what* was limited without parsing operation names or English copy.
 * Operations without a client-facing feature are omitted; clients then fall back
 * to the feature they asked for.
 */
export const QUOTA_FEATURE_BY_OPERATION: Partial<Record<QuotaOperation, string>> = {
  chat: 'COACH_CHAT',
  workout_analysis: 'ACTIVITY_ANALYSIS',
  athlete_profile_generation: 'ATHLETE_REPORT',
  daily_checkin: 'DAILY_CHECKIN',
  activity_recommendation: 'READINESS_RECOMMENDATION',
  meal_recommendation: 'MEAL_RECOMMENDATION',
  generate_structured_workout: 'WORKOUT_GENERATION'
}

export function quotaFeatureCode(operation: string): string | null {
  const canonical = mapOperationToQuota(operation)
  if (!canonical) return null
  return QUOTA_FEATURE_BY_OPERATION[canonical] ?? null
}

/** Next paid tier above `tier`, or null when already on the top tier. */
export function getNextTier(tier: SubscriptionTier): 'SUPPORTER' | 'PRO' | null {
  if (tier === 'FREE') return 'SUPPORTER'
  if (tier === 'SUPPORTER') return 'PRO'
  return null
}

/**
 * Lowest tier above `tier` that actually raises the limit for `operation`.
 * Returns null when no higher tier improves it — never point at an upgrade that
 * would not lift the limit the user just hit.
 */
export function resolveUpgradeForOperation(
  operation: string,
  tier: SubscriptionTier
): { nextTier: 'SUPPORTER' | 'PRO'; nextTierLimit: number } | null {
  const canonical = mapOperationToQuota(operation)
  if (!canonical) return null

  const currentLimit = QUOTA_REGISTRY[tier][canonical]?.limit ?? 0
  const candidates: ('SUPPORTER' | 'PRO')[] =
    tier === 'FREE' ? ['SUPPORTER', 'PRO'] : tier === 'SUPPORTER' ? ['PRO'] : []

  for (const candidate of candidates) {
    const limit = QUOTA_REGISTRY[candidate][canonical]?.limit
    if (limit !== undefined && limit > currentLimit) {
      return { nextTier: candidate, nextTierLimit: limit }
    }
  }

  return null
}
