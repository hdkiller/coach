type AnalyticsParams = Record<string, string | number | boolean | undefined | null | object>

type TrackOptions = {
  beacon?: boolean
}

function isAnalyticsEnabled() {
  if (import.meta.server) return false

  const config = useRuntimeConfig()
  return Boolean(config.public.gtag?.enabled || config.public.gtag?.id)
}

function trackEvent(eventName: string, params: AnalyticsParams = {}, options: TrackOptions = {}) {
  if (!isAnalyticsEnabled()) return

  const { gtag } = useGtag()
  const payload = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null)
  )

  gtag('event', eventName, {
    ...payload,
    ...(options.beacon ? { transport_type: 'beacon' } : {})
  })
}

export function useAnalytics() {
  return {
    trackEvent,

    // 1. Monetization & Quota
    trackUpgradeView: (featureName: string, reason: string = 'upsell') => {
      trackEvent('view_promotion', {
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
      trackEvent('begin_checkout', {
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

    trackPurchase: (transactionId: string, value: number, currency: string, tier?: string) => {
      trackEvent('purchase', {
        transaction_id: transactionId,
        value,
        currency: currency.toUpperCase(),
        item_category: tier
      })
    },

    trackBillingPortalView: () => {
      trackEvent('view_billing_portal')
    },

    trackPricingView: (entryPoint: string = 'direct') => {
      trackEvent('pricing_view', {
        entry_point: entryPoint
      })
    },

    // 2. AI Coaching & Recommendations
    trackRecommendationRequest: (isRefinement: boolean, hasFeedback: boolean) => {
      trackEvent('recommendation_request', {
        is_refinement: isRefinement,
        has_feedback: hasFeedback
      })
    },

    trackRecommendationAccept: (recommendationId: string, type: string) => {
      trackEvent('recommendation_accept', {
        recommendation_id: recommendationId,
        type
      })
    },

    trackAiFeedback: (sentiment: 'positive' | 'negative', feature: string) => {
      trackEvent('ai_feedback_submit', {
        sentiment,
        feature
      })
    },

    trackAiLogView: () => {
      trackEvent('ai_log_view')
    },

    trackAthleteProfileGenerate: () => {
      trackEvent('athlete_profile_generate')
    },

    // 3. AI Chat & Tools
    trackChatSessionStart: (roomId: string) => {
      trackEvent('chat_session_start', {
        room_id: roomId
      })
    },

    trackChatToolExpand: (toolName: string) => {
      trackEvent('chat_tool_expanded', {
        tool_name: toolName
      })
    },

    trackChatError: (errorType: string) => {
      trackEvent('chat_error', {
        error_type: errorType
      })
    },

    // 4. Integrations & Sync
    trackIntegrationConnectStart: (provider: string) => {
      trackEvent('integration_connect_start', {
        provider
      })
    },

    trackIntegrationConnectSuccess: (provider: string) => {
      trackEvent('integration_connect_success', {
        provider
      })
    },

    trackManualSyncAll: () => {
      trackEvent('sync_all_manual')
    },

    // 5. Engagement & Training
    trackDailyCheckinStart: () => {
      trackEvent('daily_checkin_start')
    },

    trackDailyCheckinComplete: () => {
      trackEvent('daily_checkin_complete')
    },

    trackAdhocWorkoutCreate: (sportType: string) => {
      trackEvent('adhoc_workout_create', {
        sport_type: sportType
      })
    },

    trackWorkoutViewDetail: (workoutType: 'planned' | 'completed') => {
      trackEvent('workout_view_detail', {
        workout_type: workoutType
      })
    },

    // 6. Acquisition & Activation
    trackSignUp: (method: string) => {
      trackEvent(
        'sign_up',
        {
          method
        },
        { beacon: true }
      )
    },

    trackLogin: (method: string) => {
      trackEvent(
        'login',
        {
          method
        },
        { beacon: true }
      )
    },

    trackOnboardingView: () => {
      trackEvent('onboarding_view')
    },

    trackOnboardingComplete: () => {
      trackEvent('onboarding_complete')
    },

    // 7. Navigation & UI
    trackNavigation: (destinationPath: string, sourcePath: string, section?: string) => {
      trackEvent('app_navigation', {
        destination_path: destinationPath,
        source_path: sourcePath,
        section: section || inferAppSection(destinationPath)
      })
    },

    trackNavClick: (destinationPath: string, label: string) => {
      trackEvent('nav_click', {
        destination_path: destinationPath,
        nav_label: label
      })
    },

    trackWidgetClick: (widgetName: string, action: string = 'click') => {
      trackEvent('widget_click', {
        widget_name: widgetName,
        action
      })
    },

    trackModalOpen: (modalName: string, context?: string) => {
      trackEvent('modal_open', {
        modal_name: modalName,
        context
      })
    },

    trackModalComplete: (modalName: string, action: string = 'submit') => {
      trackEvent('modal_complete', {
        modal_name: modalName,
        action
      })
    },

    trackModalDismiss: (modalName: string, reason: string = 'close') => {
      trackEvent('modal_dismiss', {
        modal_name: modalName,
        reason
      })
    },

    trackTabFilterChange: (page: string, filterType: string, value: string | number) => {
      trackEvent('tab_filter_change', {
        page,
        filter_type: filterType,
        value: String(value)
      })
    },

    trackWorkoutSectionView: (sectionKey: string) => {
      trackEvent('workout_section_view', {
        section: sectionKey
      })
    },

    trackPlanBlockSelect: (blockId: string) => {
      trackEvent('plan_block_select', {
        block_id: blockId
      })
    },

    trackPlanWeekSelect: (weekId: string) => {
      trackEvent('plan_week_select', {
        week_id: weekId
      })
    },

    // 8. Nutrition
    trackNutritionView: (view: 'index' | 'detail' | 'history') => {
      trackEvent('nutrition_view', {
        view
      })
    },

    trackNutritionAnalyze: (scope: 'single' | 'bulk') => {
      trackEvent('nutrition_analyze', {
        scope
      })
    },

    // 9. Sharing
    trackSharePromptView: (messageType: string) => {
      trackEvent('share_prompt_view', {
        message_type: messageType
      })
    },

    trackShareModalOpen: () => {
      trackEvent('share_modal_open')
    },

    trackShareLinkCopy: () => {
      trackEvent('share_link_copy')
    },

    trackShareNetworkClick: (network: string) => {
      trackEvent('share_network_click', {
        network
      })
    },

    trackShareRewardClaim: (daysGranted: number) => {
      trackEvent('share_reward_claim', {
        days_granted: daysGranted
      })
    },

    trackShareRewardClaimRejected: (reason: string) => {
      trackEvent('share_reward_claim_rejected', {
        reason
      })
    },

    trackPartnerPageView: (campaignSlug: string, availability: string) => {
      trackEvent('partner_page_view', {
        campaign_slug: campaignSlug,
        availability
      })
    },

    trackPartnerSignupStart: (campaignSlug: string) => {
      trackEvent('partner_signup_start', {
        campaign_slug: campaignSlug
      })
    },

    trackPartnerRedemption: (
      campaignSlug: string,
      status: 'completed' | 'already_redeemed' | 'rejected',
      reason?: string
    ) => {
      trackEvent('partner_redemption', {
        campaign_slug: campaignSlug,
        status,
        ...(reason ? { reason } : {})
      })
    }
  }
}

function inferAppSection(path: string): string {
  if (path.startsWith('/dashboard')) return 'dashboard'
  if (path.startsWith('/activities')) return 'activities'
  if (path.startsWith('/chat')) return 'chat'
  if (path.startsWith('/plan')) return 'plan'
  if (path.startsWith('/nutrition')) return 'nutrition'
  if (path.startsWith('/performance')) return 'performance'
  if (path.startsWith('/recommendations')) return 'recommendations'
  if (path.startsWith('/workouts')) return 'workouts'
  if (path.startsWith('/settings')) return 'settings'
  if (path.startsWith('/onboarding')) return 'onboarding'
  if (path.startsWith('/analytics')) return 'analytics'
  if (path.startsWith('/coaching')) return 'coaching'
  if (path.startsWith('/profile')) return 'profile'
  if (path === '/') return 'home'
  return 'other'
}
