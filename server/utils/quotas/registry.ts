import type { SubscriptionTier } from '@prisma/client'

export type QuotaOperation =
  | 'chat'
  | 'workout_analysis'
  | 'athlete_profile_generation'
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

export interface QuotaDefinition {
  limit: number
  window: string // postgres interval string: '4 hours', '7 days', etc.
  enforcement: EnforcementType
}

export const QUOTA_REGISTRY: Record<
  SubscriptionTier,
  Partial<Record<QuotaOperation, QuotaDefinition>>
> = {
  FREE: {
    chat: { limit: 5, window: '4 hours', enforcement: 'STRICT' },
    workout_analysis: { limit: 10, window: '7 days', enforcement: 'STRICT' },
    athlete_profile_generation: { limit: 1, window: '24 hours', enforcement: 'STRICT' },
    daily_checkin: { limit: 1, window: '24 hours', enforcement: 'STRICT' },
    unified_report_generation: { limit: 1, window: '30 days', enforcement: 'STRICT' },
    nutrition_analysis: { limit: 5, window: '7 days', enforcement: 'STRICT' },
    activity_recommendation: { limit: 1, window: '24 hours', enforcement: 'STRICT' },
    meal_recommendation: { limit: 3, window: '24 hours', enforcement: 'STRICT' },
    generate_structured_workout: { limit: 5, window: '7 days', enforcement: 'STRICT' },
    wellness_analysis: { limit: 5, window: '7 days', enforcement: 'STRICT' },
    custom_report_generation: { limit: 1, window: '30 days', enforcement: 'STRICT' },
    weekly_plan_generation: { limit: 1, window: '7 days', enforcement: 'STRICT' }
  },
  SUPPORTER: {
    chat: { limit: 50, window: '4 hours', enforcement: 'STRICT' },
    workout_analysis: { limit: 30, window: '7 days', enforcement: 'STRICT' },
    athlete_profile_generation: { limit: 5, window: '24 hours', enforcement: 'STRICT' },
    daily_checkin: { limit: 2, window: '24 hours', enforcement: 'STRICT' },
    unified_report_generation: { limit: 5, window: '30 days', enforcement: 'STRICT' },
    nutrition_analysis: { limit: 20, window: '7 days', enforcement: 'STRICT' },
    activity_recommendation: { limit: 5, window: '24 hours', enforcement: 'STRICT' },
    meal_recommendation: { limit: 10, window: '24 hours', enforcement: 'STRICT' },
    generate_structured_workout: { limit: 20, window: '7 days', enforcement: 'STRICT' },
    wellness_analysis: { limit: 20, window: '7 days', enforcement: 'STRICT' },
    custom_report_generation: { limit: 5, window: '30 days', enforcement: 'STRICT' },
    weekly_plan_generation: { limit: 2, window: '7 days', enforcement: 'STRICT' }
  },
  PRO: {
    chat: { limit: 500, window: '4 hours', enforcement: 'STRICT' },
    workout_analysis: { limit: 100, window: '7 days', enforcement: 'STRICT' },
    athlete_profile_generation: { limit: 20, window: '24 hours', enforcement: 'STRICT' },
    daily_checkin: { limit: 5, window: '24 hours', enforcement: 'STRICT' },
    unified_report_generation: { limit: 20, window: '30 days', enforcement: 'STRICT' },
    nutrition_analysis: { limit: 100, window: '7 days', enforcement: 'STRICT' },
    activity_recommendation: { limit: 20, window: '24 hours', enforcement: 'STRICT' },
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
