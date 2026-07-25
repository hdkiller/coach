export const ANALYTICS_EVENTS = {
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_FAILED: 'signup_failed',
  ACCOUNT_CREATED: 'account_created',
  CONSENT_VIEWED: 'consent_viewed',
  CONSENT_COMPLETED: 'consent_completed',
  SETUP_HUB_VIEWED: 'setup_hub_viewed',
  INTEGRATION_CONNECT_STARTED: 'integration_connect_started',
  INTEGRATION_CONNECT_FAILED: 'integration_connect_failed',
  INTEGRATION_CONNECTED: 'integration_connected',
  LOGIN: 'login'
} as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

export type AcquisitionContext = {
  entry_point?: string
  referral_type?: string
  /** Personal athlete referral code (`via=`). Distinct from campaign `ref` / referral_type. */
  referral_code?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

export function buildAcquisitionContext(
  query: Record<string, unknown>,
  entryPoint = 'join'
): AcquisitionContext {
  const context: AcquisitionContext = { entry_point: entryPoint }

  for (const key of [
    'referral_type',
    'ref',
    'via',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term'
  ] as const) {
    const value = query[key]
    if (typeof value === 'string' && value.trim()) {
      if (key === 'ref') {
        context.referral_type = value
      } else if (key === 'via') {
        context.referral_code = value.trim().toUpperCase()
      } else {
        context[key] = value
      }
    }
  }

  return context
}

export function sanitizeAnalyticsParams(
  params: Record<string, string | number | boolean | undefined | null>
) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  )
}
