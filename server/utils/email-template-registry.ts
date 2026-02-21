import type { EmailAudience } from '@prisma/client'

export type EmailPreferenceKey =
  | 'onboarding'
  | 'workoutAnalysis'
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
}

export const EMAIL_TEMPLATE_REGISTRY: Record<string, EmailTemplateDefinition> = {
  Welcome: {
    templateKey: 'Welcome',
    defaultSubject: 'Welcome to Coach Watts!',
    audience: 'ENGAGEMENT',
    preferenceKey: 'onboarding',
    requiredProps: [],
    utmCampaign: 'welcome_onboarding'
  },
  WorkoutAnalysisReady: {
    templateKey: 'WorkoutAnalysisReady',
    defaultSubject: 'Workout Analysis Ready',
    audience: 'ENGAGEMENT',
    preferenceKey: 'workoutAnalysis',
    requiredProps: ['workoutTitle'],
    utmCampaign: 'workout_analysis_ready'
  },
  DailyRecommendation: {
    templateKey: 'DailyRecommendation',
    defaultSubject: "Today's Training",
    audience: 'ENGAGEMENT',
    preferenceKey: 'dailyCoach',
    requiredProps: ['date', 'recommendation', 'reasoning'],
    utmCampaign: 'daily_recommendation'
  },
  SubscriptionStarted: {
    templateKey: 'SubscriptionStarted',
    defaultSubject: 'Welcome to Coach Watts Pro!',
    audience: 'TRANSACTIONAL',
    preferenceKey: null,
    requiredProps: ['tier'],
    utmCampaign: 'subscription_started'
  }
}

export function getEmailTemplateDefinition(templateKey: string): EmailTemplateDefinition | null {
  return EMAIL_TEMPLATE_REGISTRY[templateKey] || null
}
