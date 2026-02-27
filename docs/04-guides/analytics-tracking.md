# Google Analytics & Tracking Specification

This document outlines the Google Analytics 4 (GA4) and Google Tag Manager (GTM) implementation for Coach Watts.

## Core Integration

- **Module**: `nuxt-gtag`
- **GTM ID**: Configured via `NUXT_PUBLIC_GTAG_ID` environment variable.
- **Activation**: The module is conditionally enabled only if the ID is provided in the environment.
- **User Identity**: Managed via `app/plugins/analytics.client.ts`. It automatically sets `user_id` and `subscription_tier` for all events when a user is logged in.

## User Properties (Persistent)

These properties are set using `gtag('set', ...)` and persist across the entire session.

| Property            | Description                     | Value Example              |
| :------------------ | :------------------------------ | :------------------------- |
| `user_id`           | Unique database ID of the user  | `cm3...`                   |
| `subscription_tier` | Current active entitlement tier | `FREE`, `SUPPORTER`, `PRO` |

## Event Tracking Plan

### 1. Monetization & Quota

High-priority events related to the tiered pricing model.

| Event                 | Trigger Point                            | Parameters                                                                                  |
| :-------------------- | :--------------------------------------- | :------------------------------------------------------------------------------------------ |
| `view_promotion`      | `UpgradeModal` appears                   | `promotion_id` ('upgrade_modal'), `promotion_name` (feature name), `creative_slot` (reason) |
| `begin_checkout`      | Plan selected in `UpgradeModal`          | `item_id` (price_id), `item_name` (tier name), `currency`, `value`                          |
| `purchase`            | `/settings/billing` with `?success=true` | `transaction_id`, `value`, `currency`                                                       |
| `view_billing_portal` | Stripe Portal opened                     | N/A                                                                                         |

### 2. AI Coaching & Recommendations

Tracking the "Golden Path" of user engagement with AI insights.

| Event                      | Trigger Point                         | Parameters                                                            |
| :------------------------- | :------------------------------------ | :-------------------------------------------------------------------- |
| `recommendation_request`   | Click "Analyze Readiness" or "Refine" | `is_refinement` (bool), `has_feedback` (bool)                         |
| `recommendation_accept`    | Click "Accept" on modification        | `recommendation_id`, `type`                                           |
| `ai_feedback_submit`       | Click Thumbs Up/Down                  | `sentiment` ('positive', 'negative'), `feature` (chat, rec, analysis) |
| `athlete_profile_generate` | Trigger full profile update           | N/A                                                                   |

### 3. AI Chat & Tools

Monitoring user intent and technical transparency in the chat.

| Event                | Trigger Point                     | Parameters   |
| :------------------- | :-------------------------------- | :----------- |
| `chat_session_start` | First message in a new room       | `room_id`    |
| `chat_tool_expanded` | Clicking "Input/Response" details | `tool_name`  |
| `chat_error`         | Frontend sequence error           | `error_type` |

### 4. Integrations & Sync

Tracking onboarding health and manual sync behavior.

| Event                         | Trigger Point                     | Parameters |
| :---------------------------- | :-------------------------------- | :--------- |
| `integration_connect_start`   | Click connect (Strava/Garmin/etc) | `provider` |
| `integration_connect_success` | Successful callback landed        | `provider` |
| `sync_all_manual`             | Click "Sync All" on dashboard     | N/A        |

### 5. Engagement & Training

General application usage metrics.

| Event                    | Trigger Point                   | Parameters                         |
| :----------------------- | :------------------------------ | :--------------------------------- |
| `daily_checkin_start`    | `DailyCheckinModal` opened      | N/A                                |
| `daily_checkin_complete` | Check-in successfully submitted | N/A                                |
| `adhoc_workout_create`   | Prompt-based workout generation | `sport_type`                       |
| `workout_view_detail`    | Navigating to workout details   | `workout_type` (planned/completed) |

## Implementation for Developers

### Using Gtag in Components

Use the `useGtag` composable for custom events:

```typescript
const { gtag } = useGtag()

function trackUpgradeClick() {
  gtag('event', 'begin_checkout', {
    item_id: 'pro_monthly',
    item_name: 'Pro Plan'
  })
}
```

### Privacy & Compliance

- **Data Isolation**: We do not send PII (email, name) to Google Analytics. Only the opaque `user_id` is sent.
- **Paid Tier**: We use the Gemini API Paid Tier, ensuring coaching data is not used for Google's model training.
