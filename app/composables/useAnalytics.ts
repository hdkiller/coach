export function useAnalytics() {
  const { gtag } = useGtag()

  return {
    // 1. Monetization & Quota
    trackUpgradeView: (featureName: string, reason: string = 'upsell') => {
      gtag('event', 'view_promotion', {
        promotion_id: 'upgrade_modal',
        promotion_name: featureName,
        creative_slot: reason
      })
    },

    trackCheckoutStart: (
      planId: string,
      tierName: string,
      interval: string,
      value: number,
      currency: string
    ) => {
      gtag('event', 'begin_checkout', {
        currency: currency.toUpperCase(),
        value,
        items: [
          {
            item_id: planId,
            item_name: `${tierName} (${interval})`,
            item_category: tierName,
            price: value,
            quantity: 1
          }
        ]
      })
    },

    trackPurchase: (transactionId: string, value: number, currency: string) => {
      gtag('event', 'purchase', {
        transaction_id: transactionId,
        value,
        currency: currency.toUpperCase()
      })
    },

    trackBillingPortalView: () => {
      gtag('event', 'view_billing_portal')
    },

    // 2. AI Coaching & Recommendations
    trackRecommendationRequest: (isRefinement: boolean, hasFeedback: boolean) => {
      gtag('event', 'recommendation_request', {
        is_refinement: isRefinement,
        has_feedback: hasFeedback
      })
    },

    trackRecommendationAccept: (recommendationId: string, type: string) => {
      gtag('event', 'recommendation_accept', {
        recommendation_id: recommendationId,
        type
      })
    },

    trackAiFeedback: (sentiment: 'positive' | 'negative', feature: string) => {
      gtag('event', 'ai_feedback_submit', {
        sentiment,
        feature
      })
    },

    trackAiLogView: () => {
      gtag('event', 'ai_log_view')
    },

    trackAthleteProfileGenerate: () => {
      gtag('event', 'athlete_profile_generate')
    },

    // 3. AI Chat & Tools
    trackChatSessionStart: (roomId: string) => {
      gtag('event', 'chat_session_start', {
        room_id: roomId
      })
    },

    trackChatToolExpand: (toolName: string) => {
      gtag('event', 'chat_tool_expanded', {
        tool_name: toolName
      })
    },

    trackChatError: (errorType: string) => {
      gtag('event', 'chat_error', {
        error_type: errorType
      })
    },

    // 4. Integrations & Sync
    trackIntegrationConnectStart: (provider: string) => {
      gtag('event', 'integration_connect_start', {
        provider
      })
    },

    trackIntegrationConnectSuccess: (provider: string) => {
      gtag('event', 'integration_connect_success', {
        provider
      })
    },

    trackManualSyncAll: () => {
      gtag('event', 'sync_all_manual')
    },

    // 5. Engagement & Training
    trackDailyCheckinStart: () => {
      gtag('event', 'daily_checkin_start')
    },

    trackDailyCheckinComplete: () => {
      gtag('event', 'daily_checkin_complete')
    },

    trackAdhocWorkoutCreate: (sportType: string) => {
      gtag('event', 'adhoc_workout_create', {
        sport_type: sportType
      })
    },

    trackWorkoutViewDetail: (workoutType: 'planned' | 'completed') => {
      gtag('event', 'workout_view_detail', {
        workout_type: workoutType
      })
    },

    // 6. Acquisition & Activation
    trackSignUp: (method: string) => {
      gtag('event', 'sign_up', {
        method
      })
    },

    trackLogin: (method: string) => {
      gtag('event', 'login', {
        method
      })
    }
  }
}
