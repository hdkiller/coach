# Email Communication System

The Coach Watts Email Communication System is a centralized, compliant, and branded platform for lifecycle, product, and transactional notifications. It leverages Nuxt 3, Trigger.dev v3, and Resend for efficient and reliable delivery.

## Key Features

- **Branded Templates**: Custom Vue-based templates using `@vue-email/nuxt`, following the official style guide (Public Sans, Action Green).
- **Admin Approval Gate**: All outbound emails are initially queued for manual review in the `/admin/emails` dashboard before dispatch.
- **User Preference Center**: Granular opt-in/opt-out controls in user settings (Training Insights, Product, Marketing, etc.).
- **Automated Triggers**: Seamless integration with system events like signup, subscription updates, and AI workout analysis.
- **Automatic Training Recommendations**: Daily coaching briefs sent based on user-configurable schedules and automated sync events.
- **Secure Unsubscribe**: One-click, unauthenticated unsubscribe flow using cryptographic HMAC-signed tokens.

## Architecture

1.  **Triggering**: A domain event or manual CLI command triggers the `send-email` task in Trigger.dev.
2.  **Orchestration**: The `send-email` task:
    - Verifies user preferences and suppression status.
    - Generates a secure cryptographic unsubscribe token.
    - Calls an internal Nuxt API (`/api/internal/render-email`) to render the Vue template to HTML.
3.  **Queuing**: The delivery record is saved to the `EmailDelivery` table with a `QUEUED` status.
4.  **Admin Review**: Admins preview the rendered HTML and metadata in the dashboard and click "Send Now."
5.  **Dispatch**: The email is sent via Resend API.
6.  **Webhook Ingestion**: Resend webhooks notify the system of delivery, open, and click events, which are processed by the `ResendService` in the background worker.

## Campaigns & Automated Flows

### 1. Onboarding (Transactional/Engagement)

- **Welcome**: Sent immediately upon signup.
- **Drip (Planned)**: Day 2 (Integration Check) and Day 7 (Trial Review) sequence using Trigger.dev delays.

### 2. Training Guidance (Engagement)

- **Workout Analysis**: Triggered automatically after a workout sync if "Auto-analyze Workouts" is enabled.
- **Daily Recommendation**: Sent on user-selected days and only during the user-selected local send-time window if "Auto-analyze Readiness" is enabled.

### 3. Subscription (Transactional)

- **Subscription Started**: Confirmation of upgrade.
- **Renewal/Billing (Planned)**: Critical account notifications.

## Compliance & Security

### Cryptographic Unsubscribe Tokens

Every email footer contains a unique, expiring, secure link:
`https://coachwatts.com/unsubscribe?token=BASE64URL_PAYLOAD.HMAC_SIGNATURE`

- **Generation**: `server/utils/unsubscribe-token.ts` signs a payload (`sub`, `purpose`, `iat`, `exp`, `nonce`) with `NUXT_AUTH_SECRET`.
- **Verification**: The `/unsubscribe` page verifies the signature to ensure only the account owner can use the link.
- **Suppression**: Unsubscribing via the token adds the user to the `EmailSuppression` table (manual reason) and updates their global preference.

## User Settings

Users can manage their experience in **Settings > Profile > Communication**:

- **Daily Training Recommendation**: Toggle days (Mon-Sun) and preferred time.
- **Workout Analysis**: Opt-in/out of individual session feedback.
- **Plan Updates**: Notification of coaching adjustments.
- **Global Unsubscribe**: Instantly opt-out of all optional communication.

## Developer CLI Commands

- `pnpm cw:cli email queue-welcome <userId>`: Test the welcome sequence.
- `pnpm cw:cli email queue-analysis <userId>`: Test workout analysis feedback.
- `pnpm cw:cli email queue-daily-coach <userId>`: Test daily recommendation briefs.
- `pnpm cw:cli email queue-subscription <userId>`: Test subscription confirmation.

## Tracking Conventions (UTM)

- `utm_source=coachwatts_email` for all email links.
- `utm_medium` by audience:
  - `transactional` for account and billing lifecycle mail.
  - `engagement` for coaching and analysis mail.
  - `lifecycle` for onboarding sequences.
- `utm_campaign` from the template registry, snake_case:
  - `welcome_onboarding`
  - `workout_analysis_ready`
  - `daily_recommendation`
  - `subscription_started`
- `utm_content` for CTA-level attribution (for example `cta_connect_apps`, `cta_view_analysis`).
