import type { SubscriptionTier } from '@prisma/client'
import type { PricingTier } from '~/utils/pricing'
import type { QuotaStatus } from '~/types/quotas'

export type QuotaPaywallOperation =
  | 'chat'
  | 'workout_analysis'
  | 'daily_checkin'
  | 'activity_recommendation'
  | 'weekly_plan_generation'
  | 'generate_structured_workout'
  | 'athlete_profile_generation'
  | 'custom_report_generation'
  | 'unified_report_generation'
  | 'nutrition_analysis'
  | 'wellness_analysis'
  | 'meal_recommendation'
  | 'goal_suggestions'
  | 'goal_review'

const TIER_RANK: Record<SubscriptionTier, number> = {
  FREE: 0,
  SUPPORTER: 1,
  PRO: 2
}

export function resolveRecommendedUpgradeTier(
  subscriptionTier: SubscriptionTier = 'FREE'
): PricingTier | undefined {
  if (subscriptionTier === 'PRO') return undefined
  if (subscriptionTier === 'SUPPORTER') return 'pro'
  return 'supporter'
}

export function hasQuotaResetPassed(
  resetsAt: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!resetsAt) return false
  const resetDate = new Date(resetsAt)
  return !Number.isNaN(resetDate.getTime()) && resetDate.getTime() <= now.getTime()
}

export function formatQuotaWindowLabel(window: string): string {
  if (window === 'calendar day') return 'per day'
  if (window.includes('hour')) return `per ${window}`
  if (window.includes('day') || window.includes('week')) return `per ${window}`
  return window
}

export function formatQuotaResetShort(
  resetsAt: Date | string | null | undefined,
  window: string
): string | null {
  if (window === 'calendar day') return 'midnight tonight'
  if (!resetsAt) return null
  const date = new Date(resetsAt)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function buildQuotaFeatureDescription(params: {
  featureLabel: string
  quota?: Pick<
    QuotaStatus,
    'used' | 'limit' | 'window' | 'resetsAt' | 'nextTier' | 'nextTierLimit'
  > | null
  nextTierName?: string
}): string {
  const { featureLabel, quota, nextTierName } = params
  if (!quota) {
    return `You've reached your ${featureLabel} limit on your current plan.`
  }

  const windowLabel = formatQuotaWindowLabel(quota.window)
  const resetLabel = formatQuotaResetShort(quota.resetsAt, quota.window)
  const usedLine = `You've used ${quota.used} of ${quota.limit} ${windowLabel} for ${featureLabel}.`
  const resetLine = resetLabel ? ` Your free allowance resets at ${resetLabel}.` : ''
  const upgradeLine =
    quota.nextTierLimit && nextTierName
      ? ` ${nextTierName} includes ${quota.nextTierLimit} ${windowLabel}.`
      : ''

  return `${usedLine}${resetLine}${upgradeLine}`.trim()
}

export function buildQuotaUpgradeBullets(
  operation: QuotaPaywallOperation,
  nextTier: 'SUPPORTER' | 'PRO' | null | undefined,
  nextTierLimit?: number | null,
  window?: string
): string[] {
  const windowLabel = window ? formatQuotaWindowLabel(window) : ''
  const limitSuffix = nextTierLimit ? `${nextTierLimit} ${windowLabel}`.trim() : 'higher limits'

  const defaults: Record<QuotaPaywallOperation, string[]> = {
    chat: ['More coach messages per window', 'Faster AI responses', 'Deeper training context'],
    workout_analysis: [
      'More automatic workout reviews',
      'Execution scoring on every session',
      'Clearer pacing and load feedback'
    ],
    daily_checkin: [
      'More daily coach check-ins',
      'Regenerate when your day changes',
      'Better readiness follow-ups'
    ],
    activity_recommendation: [
      'More daily readiness plans',
      'Refine recommendations with feedback',
      'Faster plan adjustments'
    ],
    weekly_plan_generation: [
      `${limitSuffix} for AI weekly plans`,
      'Structured training blocks',
      'Plan updates from your calendar'
    ],
    generate_structured_workout: [
      `${limitSuffix} for structured workouts`,
      'Sport-specific workout design',
      'Export-ready session structure'
    ],
    athlete_profile_generation: [
      `${limitSuffix} for athlete profile refreshes`,
      'Longer-horizon performance context',
      'Sharper score explanations'
    ],
    custom_report_generation: [
      `${limitSuffix} for custom AI reports`,
      'Deeper training reviews',
      'Shareable performance summaries'
    ],
    unified_report_generation: [
      `${limitSuffix} for unified reports`,
      'Weekly training synthesis',
      'Recovery and load context'
    ],
    nutrition_analysis: [
      `${limitSuffix} for nutrition analysis`,
      'Fuel timing feedback',
      'Compliance trend tracking'
    ],
    wellness_analysis: [
      `${limitSuffix} for readiness analysis`,
      'Recovery trend explanations',
      'Wellness anomaly detection'
    ],
    meal_recommendation: [
      `${limitSuffix} for meal recommendations`,
      'Fuel-aware meal suggestions',
      'Training-day nutrition guidance'
    ],
    goal_suggestions: [
      `${limitSuffix} for goal suggestions`,
      'Race-aware planning',
      'Priority goal framing'
    ],
    goal_review: [
      `${limitSuffix} for goal reviews`,
      'Progress checkpoints',
      'Adaptive goal coaching'
    ]
  }

  const tierLabel = nextTier === 'PRO' ? 'Pro' : 'Supporter'
  const bullets = defaults[operation] || [`${tierLabel} unlocks ${limitSuffix}`]

  if (nextTierLimit && bullets[0]) {
    bullets[0] = bullets[0].replace('higher limits', `${nextTierLimit} ${windowLabel}`.trim())
  }

  return bullets.slice(0, 4)
}

export function tierMeetsPaidSubscription(tier: SubscriptionTier): boolean {
  return TIER_RANK[tier] > TIER_RANK.FREE
}
