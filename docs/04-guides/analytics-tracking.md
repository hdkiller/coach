# Google Analytics & Tracking Specification

This document outlines the Google Analytics 4 (GA4) and Google Tag Manager (GTM) implementation for Coach Watts.

> **Onboarding funnel (Phase 1 shipped):** Signup and activation events use the canonical names below. Legacy `sign_up`, `onboarding_view`, `onboarding_complete`, `integration_connect_start`, and `integration_connect_success` are replaced by `signup_started`, `consent_viewed`, `consent_completed`, `integration_connect_started`, and `integration_connected`. `account_created` is recorded server-side on first OAuth link, with optional GA4 Measurement Protocol delivery when `NUXT_GA_MEASUREMENT_API_SECRET` is set, and a one-time client claim fallback.

## Core Integration

- **Module**: `nuxt-gtag`
- **GTM ID**: Configured via `NUXT_PUBLIC_GTAG_ID` environment variable (Dokploy runtime env for production, e.g. `GTM-WVHG7LMQ`).
- **GA4 Measurement ID**: Configured via `NUXT_PUBLIC_GA_MEASUREMENT_ID` (defaults to `G-M3CJW4RW5S`).
- **Tag Registration**: In `nuxt.config.ts`, `gtag` registers both the GTM container ID (`NUXT_PUBLIC_GTAG_ID`) and the GA4 Measurement ID (`G-M3CJW4RW5S` via `tags`). This executes `gtag('config', 'G-M3CJW4RW5S')` alongside GTM initialization, ensuring client `gtag('event', ...)` calls transmit directly to GA4 property `526217906`.
- **Server Measurement Protocol**: `server/utils/product-analytics.ts` posts server-side events (`account_created`) directly to GA4 Measurement Protocol using `G-M3CJW4RW5S` (never the GTM ID) when `NUXT_GA_MEASUREMENT_API_SECRET` is set, with automatic client-claim fallback when secret is unset.
- **Activation**: The module is always included in the build so Docker/CI images keep the real client plugin. The tag script loads only when `NUXT_PUBLIC_GTAG_ID` is present at runtime (the plugin no-ops if the id is empty). Do **not** gate `gtag.enabled` on build-time env — that baked mocks into production and stopped collection.
- **User Identity**: Managed via `app/plugins/analytics.client.ts`. It automatically sets `user_id` and `subscription_tier` for all events when a user is logged in.

## User Properties (Persistent)

These properties are set using `gtag('set', ...)` and persist across the entire session.

| Property            | Description                     | Value Example              |
| :------------------ | :------------------------------ | :------------------------- |
| `user_id`           | Unique database ID of the user  | `cm3...`                   |
| `subscription_tier` | Current active entitlement tier | `FREE`, `SUPPORTER`, `PRO` |
| `client_theme`      | Current UI theme preference     | `dark`, `light`, `system`  |

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
| `integration_connect_start`   | Click connect (Strava/Garmin/etc) | `provider` | **Renamed** to `integration_connect_started` |
| `integration_connect_success` | Successful callback landed        | `provider` | **Renamed** to `integration_connected`       |
| `sync_all_manual`             | Click "Sync All" on dashboard     | N/A        |

### 5. Engagement & Training

General application usage metrics.

| Event                    | Trigger Point                    | Parameters                         |
| :----------------------- | :------------------------------- | :--------------------------------- |
| `daily_checkin_start`    | `DailyCheckinModal` opened       | N/A                                |
| `daily_checkin_complete` | Check-in successfully submitted  | N/A                                |
| `adhoc_workout_create`   | Prompt-based workout generation  | `sport_type`                       |
| `workout_rescheduled`    | User moves a planned workout     | `sport_type`, `days_shifted`       |
| `plan_regenerated`       | User explicitly regenerates plan | `reason`                           |
| `workout_view_detail`    | Navigating to workout details    | `workout_type` (planned/completed) |

## KPI Framework (What Success Looks Like)

Use this section as the KPI contract for dashboards and weekly reviews.

| KPI                           | Definition                                                                     | Primary Events                                                                                                       | Target Cadence   |
| :---------------------------- | :----------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :--------------- |
| Acquisition Rate              | New account creations by source/channel.                                       | `account_created`, `signup_started`, UTM/referrer params                                                             | Daily / Weekly   |
| Activation Rate (D1 / D7)     | % of new users who reach first value moment (at least one key success action). | `first_value_viewed` (planned), `integration_connected`, legacy milestone events below                               | Daily / Weekly   |
| Trial-to-Paid Conversion      | % of eligible users who convert to paid.                                       | `pricing_view`, `view_promotion`, `begin_checkout`, `purchase`, `checkout_error`, `purchase_failed`                  | Daily / Weekly   |
| Retained Coaching Users (WAU) | Weekly active users completing at least one core coaching behavior.            | `daily_checkin_complete`, `recommendation_request`, `recommendation_accept`, `chat_session_start`, `sync_all_manual` | Weekly           |
| Churn Rate                    | % of paid users who cancel and do not reactivate within 30 days.               | `subscription_cancel_start`, `subscription_cancel_confirmed`, `reactivation`, `churn_reason_submit`                  | Weekly / Monthly |
| Product Outcome Quality       | Whether coaching usage turns into user behavior change and adherence.          | `recommendation_accept`, `recommendation_applied`, `workout_completed`, `workout_skipped`, `checkin_streak_7d`       | Weekly           |
| Reliability (AI + Sync)       | Technical quality of user-critical flows.                                      | `ai_generation_failed`, `ai_response_latency_bucket`, `integration_sync_failed`, `integration_sync_duration_bucket`  | Daily / Weekly   |

## Core KPI Support Events

These events are required to fully calculate the metrics defined in the KPI Framework above.

### 6. Acquisition & Attribution

| Event             | Trigger Point                                                   | Parameters                                           |
| :---------------- | :-------------------------------------------------------------- | :--------------------------------------------------- |
| `signup_started`  | OAuth button click on `/join`, before redirect                  | `method`, `entry_point`, `referral_type`, UTM fields |
| `signup_failed`   | OAuth start failure on `/join`                                  | `method`, `failure_stage`, `error_code`, UTM fields  |
| `account_created` | First OAuth account linked (server audit + GA4 MP/client claim) | `method`, `entry_point`, optional `source`           |
| `first_login`     | First successful session                                        | `days_from_signup`                                   |
| `pricing_view`    | User lands on pricing or upgrade surface                        | `entry_point`, `source_page`                         |

### 6b. Onboarding & consent

| Event                         | Trigger Point                    | Parameters                                               |
| :---------------------------- | :------------------------------- | :------------------------------------------------------- |
| `consent_viewed`              | Consent page mount               | `terms_version`, `privacy_version`                       |
| `consent_completed`           | Successful consent API response  | `terms_version`, `privacy_version`, `seconds_since_view` |
| `setup_hub_viewed`            | Dashboard onboarding hub shown   | `current_step`, `resume`, `signup_method`                |
| `integration_connect_started` | Provider CTA click               | `provider`, `surface`, optional `signup_method`          |
| `integration_connect_failed`  | OAuth/API failure (when wired)   | `provider`, `failure_stage`, `error_code`, `surface`     |
| `integration_connected`       | Successful persisted integration | `provider`, optional `is_first`                          |

See the full canonical funnel in [new-user-onboarding-conversion-plan.md](../06-plans/new-user-onboarding-conversion-plan.md#recommended-canonical-funnel).

### 7. Activation Milestones (Time-to-Value)

| Event                            | Trigger Point                                | Parameters                                |
| :------------------------------- | :------------------------------------------- | :---------------------------------------- |
| `first_integration_connected`    | First successful provider connect for a user | `provider`, `days_from_signup`            |
| `first_checkin_complete`         | First completed daily check-in               | `days_from_signup`                        |
| `first_ai_recommendation_accept` | First accepted recommendation                | `recommendation_type`, `days_from_signup` |
| `first_workout_completed`        | First completed workout detected             | `sport_type`, `days_from_signup`          |

### 8. Conversion & Billing Failure Visibility

| Event             | Trigger Point                                | Parameters                                      |
| :---------------- | :------------------------------------------- | :---------------------------------------------- |
| `plan_compare`    | User toggles/compares plans                  | `billing_period`, `from_tier`, `to_tier`        |
| `checkout_error`  | Stripe checkout fails before confirmation    | `error_code`, `plan_id`, `currency`             |
| `purchase_failed` | Purchase attempt fails terminally            | `failure_reason`, `plan_id`, `currency`         |
| `purchase_refund` | Refund detected from webhook or billing sync | `transaction_id`, `value`, `currency`, `reason` |

### 9. Retention, Churn & Win-Back

| Event                           | Trigger Point                               | Parameters                            |
| :------------------------------ | :------------------------------------------ | :------------------------------------ |
| `subscription_cancel_start`     | User opens cancellation flow                | `tier`, `tenure_days`                 |
| `subscription_cancel_confirmed` | Cancellation completed                      | `tier`, `effective_date`              |
| `churn_reason_submit`           | User submits explicit cancellation reason   | `reason_code`, `reason_text_optional` |
| `reactivation`                  | Previously canceled user becomes paid again | `previous_tier`, `new_tier`           |

### 10. Reliability & Latency

| Event                              | Trigger Point                     | Parameters                                    |
| :--------------------------------- | :-------------------------------- | :-------------------------------------------- |
| `ai_generation_failed`             | AI response request ends in error | `feature`, `error_type`, `model`              |
| `ai_response_latency_bucket`       | AI response completed             | `feature`, `latency_bucket_ms`                |
| `integration_sync_failed`          | Manual or background sync fails   | `provider`, `error_type`, `is_manual`         |
| `integration_sync_duration_bucket` | Sync completes                    | `provider`, `duration_bucket_ms`, `is_manual` |

## Funnel Definitions

Standardize these funnels in GA explorations and BI exports:

1. `Acquisition -> Activation`: `signup_started` → `account_created` → `consent_completed` → `integration_connected` → `first_data_imported` → `first_value_viewed`.
2. `Monetization`: `pricing_view` -> `view_promotion` -> `begin_checkout` -> `purchase`.
3. `Retention`: Weekly users with at least one of `daily_checkin_complete`, `recommendation_accept`, `chat_session_start`.

## Implementation for Developers

### Using Gtag in Components

Use the `useGtag` composable for custom events:

```typescript
const { gtag } = useGtag()

function trackUpgradeClick() {
  // Best Practice: Use constants/enums for exact string values to prevent typos breaking funnels
  gtag('event', 'begin_checkout', {
    item_id: PlanTiers.PRO_MONTHLY,
    item_name: 'Pro Plan'
  })
}
```

### Email UTM Serialization

Tracking for all outbound emails is centralized in `trigger/send-email.ts`. It utilizes metadata from `EMAIL_TEMPLATE_REGISTRY` to construct a standardized `utmQuery` string:

- `utm_source`: Always `coachwatts_email`.
- `utm_medium`: Sourced from `template.utmMedium`.
- `utm_campaign`: Sourced from `template.utmCampaign`.

Templates receive this as a `utmQuery` prop and append it to links along with optional `utm_content` parameters.

### Privacy & Compliance

- **Data Isolation**: We do not send PII (email, name) to Google Analytics. Only the opaque `user_id` is sent.
- **Paid Tier**: We use the Gemini API Paid Tier, ensuring coaching data is not used for Google's model training.
