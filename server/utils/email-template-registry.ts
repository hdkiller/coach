import type { EmailAudience } from '@prisma/client'

export type EmailPreferenceKey =
  | 'onboarding'
  | 'workoutAnalysis'
  | 'thresholdUpdates'
  | 'planUpdates'
  | 'billing'
  | 'productUpdates'
  | 'retentionNudges'
  | 'dailyCoach'
  | 'marketing'

export interface EmailTemplateDefinition {
  templateKey: string
  defaultSubject: string
  audience: EmailAudience
  preferenceKey: EmailPreferenceKey | null
  requiredProps: string[]
  utmCampaign: string
  utmMedium: string
  throttleGroup?: string
  cooldownHours?: number
}

export const EMAIL_TEMPLATE_REGISTRY: Record<string, EmailTemplateDefinition> = {
  Welcome: {
    templateKey: 'Welcome',
    defaultSubject: 'Welcome to Coach Watts!',
    audience: 'ENGAGEMENT',
    preferenceKey: 'onboarding',
    requiredProps: [],
    utmCampaign: 'welcome_onboarding',
    utmMedium: 'lifecycle'
  },
  WorkoutReceived: {
    templateKey: 'WorkoutReceived',
    defaultSubject: 'Great shift: your workout is in the books',
    audience: 'ENGAGEMENT',
    preferenceKey: 'workoutAnalysis',
    requiredProps: ['workoutId', 'workoutTitle'],
    utmCampaign: 'workout_received',
    utmMedium: 'engagement',
    throttleGroup: 'WORKOUT_RECEIVED',
    cooldownHours: 0.25
  },
  WorkoutAnalysisReady: {
    templateKey: 'WorkoutAnalysisReady',
    defaultSubject: 'Excellent work: your workout analysis is ready',
    audience: 'ENGAGEMENT',
    preferenceKey: 'workoutAnalysis',
    requiredProps: ['workoutTitle'],
    utmCampaign: 'workout_analysis_ready',
    utmMedium: 'engagement',
    throttleGroup: 'WORKOUT_INSIGHTS',
    cooldownHours: 12
  },
  ThresholdUpdateDetected: {
    templateKey: 'ThresholdUpdateDetected',
    defaultSubject: 'Level Up! New Threshold Detected',
    audience: 'ENGAGEMENT',
    preferenceKey: 'thresholdUpdates',
    requiredProps: ['workoutTitle', 'metricLabel', 'oldValue', 'newValue', 'unit', 'peakValue'],
    utmCampaign: 'threshold_update_detected',
    utmMedium: 'engagement',
    throttleGroup: 'WORKOUT_INSIGHTS',
    cooldownHours: 12
  },
  DailyRecommendation: {
    templateKey: 'DailyRecommendation',
    defaultSubject: "Today's Training",
    audience: 'ENGAGEMENT',
    preferenceKey: 'dailyCoach',
    requiredProps: ['date', 'recommendation', 'reasoning'],
    utmCampaign: 'daily_recommendation',
    utmMedium: 'engagement',
    throttleGroup: 'DAILY_RECOMMENDATION',
    cooldownHours: 1
  },
  SubscriptionStarted: {
    templateKey: 'SubscriptionStarted',
    defaultSubject: 'Welcome to Coach Watts Pro!',
    audience: 'TRANSACTIONAL',
    preferenceKey: null,
    requiredProps: ['tier'],
    utmCampaign: 'subscription_started',
    utmMedium: 'transactional'
  },
  AccountDeletionScheduled: {
    templateKey: 'AccountDeletionScheduled',
    defaultSubject: 'Your Coach Watts account deletion has been scheduled',
    audience: 'TRANSACTIONAL',
    preferenceKey: null,
    requiredProps: ['initiatedBy', 'requestedAt'],
    utmCampaign: 'account_deletion_scheduled',
    utmMedium: 'transactional'
  }
}

export function getEmailTemplateDefinition(templateKey: string): EmailTemplateDefinition | null {
  return EMAIL_TEMPLATE_REGISTRY[templateKey] || null
}
