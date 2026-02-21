# Email Communication Platform Plan

## Objectives

- Build a centralized, compliant, user-friendly email communication system.
- Let users control email preferences in `/settings/profile` under a new `Communication` section.
- Support lifecycle and product emails to improve activation, retention, and re-engagement.
- Provide internal admin visibility for all outbound email deliveries.

## Product Scope

- Signup and onboarding follow-ups.
- Subscription lifecycle emails (started, renewed, payment issues, cancellation follow-up).
- Product event emails (for example, workout analysis completed).
- Re-engagement emails (inactivity nudges, weekly summary).
- Compliance flows (unsubscribe, suppression, consent tracking, required-vs-optional handling).

## Guiding Rules

- Keep all sending behind a single service layer and template registry; no direct provider calls from features.
- Separate `transactional` and `engagement` categories with clear policy.
- Enforce user preferences before sending optional emails.
- Log every send attempt and provider response for observability and admin review.
- Prefer idempotent event processing to avoid duplicate emails.
- Leverage Trigger.dev for all email background tasks to ensure retryability and prevent blocking the main Node.js event loop during template rendering and dispatch.

## Event & Campaign Integration Strategy

Using Trigger.dev v3, we can handle both immediate notifications and delayed drip campaigns effectively without building custom cron jobs or complex scheduling logic.

1. **Transactional / Immediate Events (e.g., Workout Analysis):**
   - The system triggers the `send-email` task directly from the backend or another Trigger.dev task. For example, at the end of `analyze-workout.ts`, we add:
     ```typescript
     await tasks.trigger("send-email", { templateKey: "WORKOUT_ANALYSIS_READY", userId: user.id, data: { ... } });
     ```
   - This ensures the email is queued as soon as the prerequisite work is complete.

2. **Drip Campaigns / Delayed Events (e.g., Onboarding Sequence):**
   - **Option A (Simple Delays):** We can use Trigger.dev's `delay` option. When a user signs up, we can trigger multiple delayed tasks:
     ```typescript
     await tasks.trigger('send-email', { templateKey: 'WELCOME', userId: user.id })
     await tasks.trigger(
       'send-email',
       { templateKey: 'ONBOARDING_DAY_2', userId: user.id },
       { delay: '2d' }
     )
     await tasks.trigger(
       'send-email',
       { templateKey: 'ONBOARDING_DAY_7', userId: user.id },
       { delay: '7d' }
     )
     ```
   - **Option B (Dedicated Campaign Task):** For complex logic (e.g., "Don't send Day 2 email if they already connected Strava"), we can create a dedicated `onboarding-campaign` task that uses `wait.for({ days: 2 })` between sending emails. This allows for conditional logic to be evaluated at the exact time the email is supposed to be sent.

## Current State (Today)

- Shared sender utility exists at `server/utils/email.ts` (Resend-based).
- Support flow uses it via `server/api/support/send.post.ts`.
- Unified notification taxonomy, user email preference center, and delivery analytics model implemented.

## Target Architecture

1. **Domain Action:** `Email Event` emitted by domain flows (signup, subscription updates, analysis ready).
2. **Task Triggering:** Nuxt API triggers a Trigger.dev task (`trigger.trigger('send-email', { payload, idempotencyKey })`).
3. **Trigger.dev Task Orchestrator:**
   - Fetches User `EmailPreference`.
   - Checks suppression list and exits early if unsubscribed/suppressed.
   - Renders the Vue-based email template to HTML via an internal rendering API.
   - Saves payload to `EmailDelivery` table as `QUEUED`.
4. **Manual Review (Phase 2-4):** Admins review generated HTML in `/admin/emails` and click "Send Now" (server-enforced admin auth + atomic send lock).
5. **Provider Adapter:** Sends via Resend.
6. **Webhook Ingestion:** Dedicated endpoint (`server/api/webhooks/resend.post.ts`) listens for Resend webhooks, verifies signatures with `svix`, and enqueues a job into the internal `webhookQueue` (BullMQ). The `ResendService` processes this job in the `cw:worker` and updates the `EmailDelivery` table (`DELIVERED`, `OPENED`, `CLICKED`, `BOUNCED`).
7. **Internal Rendering Security:** `server/api/internal/render-email.post.ts` requires an internal token (`INTERNAL_API_TOKEN`) and rejects unauthenticated render requests.
8. **Admin UI:** Reads delivery logs, filtering by user/type/status/date.

## Required Prisma Schema Changes

### 1) New Enums

```prisma
enum EmailAudience {
  TRANSACTIONAL
  ENGAGEMENT
  MARKETING
}

enum EmailDeliveryStatus {
  QUEUED
  SENDING
  SENT
  DELIVERED
  OPENED
  CLICKED
  BOUNCED
  COMPLAINED
  UNSUBSCRIBED
  FAILED
  SUPPRESSED
}

enum EmailProvider {
  RESEND
}

enum EmailPreferenceChannel {
  EMAIL
}
```

### 2) New Models

```prisma
model EmailPreference {
  id                    String   @id @default(uuid())
  userId                String
  channel               EmailPreferenceChannel @default(EMAIL)
  onboarding            Boolean  @default(true)
  workoutAnalysis       Boolean  @default(true)
  planUpdates           Boolean  @default(true)
  billing               Boolean  @default(true) // usually required/limited toggle UX
  productUpdates        Boolean  @default(true)
  retentionNudges       Boolean  @default(true)
  marketing             Boolean  @default(false)
  globalUnsubscribe     Boolean  @default(false)
  consentUpdatedAt      DateTime @default(now())
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, channel])
  @@index([userId])
}

model EmailDelivery {
  id                    String               @id @default(uuid())
  userId                String?
  templateKey           String               // e.g. WORKOUT_ANALYSIS_READY_V1 (maps to code component)
  provider              EmailProvider        @default(RESEND)
  providerMessageId     String?              @unique
  eventKey              String               // e.g. WORKOUT_ANALYSIS_READY
  audience              EmailAudience
  status                EmailDeliveryStatus  @default(QUEUED)
  toEmail               String
  subject               String
  htmlBody              String?              @db.Text
  textBody              String?              @db.Text
  fromEmail             String?
  replyToEmail          String?
  idempotencyKey        String?              @unique
  metadata              Json?
  errorCode             String?
  errorMessage          String?
  queuedAt              DateTime?
  sentAt                DateTime?
  deliveredAt           DateTime?
  openedAt              DateTime?
  clickedAt             DateTime?
  bouncedAt             DateTime?
  complainedAt          DateTime?
  unsubscribedAt        DateTime?
  createdAt             DateTime             @default(now())
  updatedAt             DateTime             @updatedAt
  user                  User?                @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([eventKey, createdAt])
  @@index([status, createdAt])
  @@index([toEmail, createdAt])
}

model EmailSuppression {
  id             String   @id @default(uuid())
  email          String
  reason         String   // UNSUBSCRIBE, BOUNCE, COMPLAINT, MANUAL
  source         String?  // webhook/manual/system
  active         Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([email, reason, active])
  @@index([email])
}
```

### 3) User Model Additions

Add relations on `User`:

```prisma
  emailPreferences EmailPreference[]
  emailDeliveries  EmailDelivery[]
```

## Migration Strategy

1. **[x] Migration A:** add enums + `EmailPreference` + `EmailDelivery` + `EmailSuppression`.
2. **[x] Migration B:** add `htmlBody` and `textBody` for preview support.
3. **[x] Migration C:** add webhook-driven status transitions (BullMQ ingestion).

## Service Layer Plan

- Define an `emailQueue` in `trigger/queues.ts`.
- Create `trigger/send-email.ts` as orchestrator (using internal rendering API).
- Create `server/utils/email-service.ts` for domain-level triggering.
- Implement `ResendService` in BullMQ worker for webhook processing.

## Event Triggers Implemented

1. `USER_SIGNED_UP_FOLLOWUP` (Welcome email).
2. `SUBSCRIPTION_STARTED` (Subscription confirmation).
3. `WORKOUT_ANALYSIS_READY` (Analysis notification).

## `/profile/settings` Communication UX

- Overhauled **Communication** tab using Nuxt UI v4 components.
- Toggles grouped by category (Training Insights, Product & Marketing, Account & Billing).
- Includes "Global Unsubscribe" override.
- Explicit save action with toast feedback.

## Admin UI

- Dashboard page: `/admin/emails`.
- Table columns: queued date, recipient, subject, template, status.
- **Email Preview Modal**: Multi-slot layout with HTML rendering, metadata, and "Send Now" action.

## Template Stack: Vue-Based Rendering (Recommended)

### Option C: Vue-based Email Rendering (`@vue-email/nuxt`) - **SELECTED**

- Author templates using Vue components (`app/emails/`).
- Templates overhauled to follow **BRANDING.md** (Public Sans, Zinc colors, Action Green buttons).

## Refined Rollout Phases

1. **[x] Foundation (Plumbing):** Prisma schema, Resend webhook worker, and Trigger.dev `emailQueue`.
2. **[x] Templating & Admin Override:** Branded templates, orchestrator, and `/admin/emails` review dashboard.
3. **[x] User Controls:** Integrated **Communication** tab in profile settings.
4. **[x] First Campaigns:** Signup follow-up, subscription started, workout analysis ready.
5. **[x] Secure Unsubscribe:** Implemented secure HMAC-signed unsubscribe tokens and a public 1-click unsubscribe landing page.
6. **[ ] Optimization & Full Automation:** Remove manual admin approval for trusted templates and automate dispatch.

## Review & Pending Improvements

The system now supports secure, unauthenticated unsubscribes. Remaining refinements:

1. **[x] Granular Preference Mapping:** `trigger/send-email.ts` now enforces template-level preference mapping using a centralized registry.
2. **[ ] Admin UI Enhancements:** Add status filters and user search to the `/admin/emails` dashboard to support scaling.
3. **[ ] Drip Campaigns:** Implement Day 2 and Day 7 onboarding logic as part of the `USER_SIGNED_UP_FOLLOWUP` flow.
4. **[ ] Automatic Dispatch:** Enable auto-sending for low-risk templates after a period of stable manual oversight.
5. **[x] Idempotency Handling:** The `send-email` task now handles Prisma `UniqueConstraintViolation` errors gracefully for the `idempotencyKey`.
