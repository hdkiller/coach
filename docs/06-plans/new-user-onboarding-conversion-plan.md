# New-user onboarding and conversion plan

Status: **in progress**  
Reviewed: 2026-07-14 (code review + session scope)  
Originally drafted: 2026-07-11  
Scope: signup, mandatory consent, first data connection, first sync, and first coaching value

## Implementation session scope (2026-07-14)

This session implements UX, conversion, analytics, and guided-setup improvements from the [2026-07-14 onboarding code review](#code-review-findings-2026-07-14). The following are **explicitly out of scope** for now — do not change in this session:

| Area       | Item                                                                    | Reason deferred                                                                       |
| ---------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Compliance | Defer Strava/Intervals ingestion until `healthConsentAcceptedAt` is set | Risk of breaking onboarding or existing users; revisit in a dedicated compliance pass |
| Compliance | Consent audit-log fields (IP, user-agent, policy version proof)         | Compliance-only; current timestamps are sufficient for this iteration                 |
| Security   | Disable `allowDangerousEmailAccountLinking` for Strava/Intervals        | Security hardening needs its own design/test pass                                     |

Everything else in the review and this plan remains **in scope** for this session, in the order below.

### Session delivery order

1. **Docs** — this file and [analytics-tracking.md](../04-guides/analytics-tracking.md) ✅
2. **Signup quick wins** — `app/pages/join.vue` ✅
3. **Consent & routing UX** ✅
4. **Analytics repair (Phase 1)** ✅
5. **Guided setup (Phase 2 MVP)** ✅

Track progress by checking items off in [Session checklist](#session-checklist-2026-07-14) as they ship.

## Executive summary

Coach Watts currently has two experiences called onboarding:

1. A mandatory legal/health-consent gate at `/onboarding`.
2. A dashboard replacement shown until the user has an integration or any imported data.

The first is correctly enforced but is not product onboarding. The second offers integration choices, but it behaves like a static connection page rather than a guided, persistent journey. Its checklist is hard-coded, it does not explain progress during OAuth/import, and it disappears as soon as any integration or data exists—before the user necessarily sees a useful coaching outcome.

Google Analytics cannot currently answer where new users are lost. `sign_up` is emitted before OAuth begins, not after an account is successfully created. The consent gate has only view and completion events. Documented first-value events are not implemented, and the dashboard onboarding experience emits no onboarding-specific step events. As a result, click intent is confused with account creation, and neither setup completion nor activation can be measured reliably.

The recommended product goal is:

> Help a new athlete reach a personalized, understandable coaching insight from their own data in the first session, while preserving progress and providing a clear next action if import takes time.

The initial north-star metric should be **D1 activated users**: new accounts that reach `first_value_viewed` within 24 hours. Supporting metrics are successful account creation, consent completion, first integration connection, first data import, and time to first value.

### Mobile activation companion (2026-07-21)

Mobile and web share `GET /api/user/onboarding-status` flags for soft vs full activation:

| State               | Criteria                                             | Behavior                                        |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| **Soft-activated**  | consent + primary goal + active plan + first insight | Companion tabs allowed; Finish-setup until data |
| **Fully activated** | soft + usable workout/wellness data                  | Normal companion; setup prompts dismiss         |

Wizard UX order (friction-aware): consent → goal lite → plan lite → insight → **connect last** (Health Sync preferred; Skip / `connectLater` OK). Dependency order for _full_ activation remains data → goal → plan → insight. Athletes who already have usable data are grandfathered past the mobile wizard.

## Current journey (implementation audit)

### 1. Acquisition and account creation

- `/join` offers Google, Strava, and Intervals.icu OAuth signup.
- The page describes signup as free and requiring no card.
- Clicking an OAuth option immediately emits GA4 `sign_up`, waits 1.5 seconds for presentation, and then starts OAuth.
- NextAuth creates the user, starts a seven-day trial, queues a welcome email, and links/synchronizes Strava or Intervals.icu accounts when those providers are used.
- A Google signup creates the account without a training-data integration.

Implication: Strava and Intervals signup can combine authentication and data connection; Google adds another required connection step. The UI and analytics do not explicitly distinguish these paths.

### 2. Mandatory consent

- Authenticated users without `termsAcceptedAt` are globally redirected to `/onboarding`.
- The user must accept legal terms and explicit health/biometric processing consent.
- Successful submission updates consent timestamps, refreshes the session, emits `onboarding_complete`, and navigates to `/dashboard`.
- Legal, privacy, auth, and invite/join routes are exempted as needed.

Implication: this step is a compliance gate, but its naming and messaging imply that accepting consent completes onboarding. It should be measured as `consent_completed`, not product activation.

### 3. Dashboard setup experience

- The dashboard loads integration status and user profile/data status.
- A user is considered `isOnboarded` if Intervals is connected, any integration exists, or workouts/nutrition/wellness data exists.
- Until then, the entire dashboard body is replaced by `DashboardOnboardingView`.
- The view strongly promotes Intervals.icu and offers Strava, WHOOP, Yazio, Fitbit, and Wahoo.
- A four-step sidebar shows account ready, connect data, analysis, and first report.
- Only the first step is marked complete. The remaining states are static; they do not react to provider connection, sync status, imported data, analysis completion, or report availability.

Implication: the checklist promises a journey the application does not render or persist. Once any connection exists, the onboarding UI disappears even if the first sync fails, imports no useful data, or the user has not viewed an insight.

### 4. First value and follow-up

- Connected users see the full dashboard and the application loads recommendations, recent activity, upcoming workouts, check-in, and nutrition data.
- Strava and Intervals authentication trigger background ingestion. Initial sync duration and success are not explained in the onboarding view.
- A welcome email is queued on user creation, with campaign metadata available through the email system.
- There is no persisted onboarding state, activation timestamp, onboarding resume point, or explicit first-value milestone in the user model.

## Google Analytics audit

### What exists

- `nuxt-gtag` is enabled when `NUXT_PUBLIC_GTAG_ID` is set.
- Authenticated events receive opaque `user_id`; subscription tier and UI theme are also set.
- App navigation is tracked globally.
- Relevant existing events include `sign_up`, `login`, `onboarding_view`, `onboarding_complete`, `integration_connect_start`, `integration_connect_success`, `daily_checkin_start`, and `daily_checkin_complete`.
- Event helpers remove null/undefined parameters and support beacon transport for auth-button events.

### Material gaps and inaccuracies

| Priority | Finding                                                                                                                                                | Conversion impact                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Critical | `sign_up` fires on OAuth button click before OAuth/account creation succeeds.                                                                          | Signup conversion is inflated and failure/cancel abandonment is invisible.           |
| Critical | No implemented `account_created`/server-confirmed signup event.                                                                                        | Acquisition cannot be joined reliably to activated users.                            |
| Critical | Documented `first_integration_connected`, `first_checkin_complete`, `first_ai_recommendation_accept`, and `first_workout_completed` events are absent. | D1/D7 activation cannot be calculated as specified.                                  |
| High     | Consent and product onboarding share generic `onboarding_*` names.                                                                                     | Compliance completion is easily mistaken for activation.                             |
| High     | Dashboard onboarding emits no view, provider selection, step, skip, failure, resume, or completion events.                                             | The largest setup surface is a measurement blind spot.                               |
| High     | `integration_connect_success` is emitted on selected settings-page callback states, not from a durable first-connection source.                        | Success coverage depends on entry point and callback implementation.                 |
| High     | Integration and ingestion failures/durations are documented but not implemented for this funnel.                                                       | Users who connect but never receive data look successful.                            |
| Medium   | Signup events do not capture preserved acquisition context such as landing page, invite/referral, or UTM values.                                       | Channel quality and invite conversion cannot be compared.                            |
| Medium   | There is no persisted first-event deduplication.                                                                                                       | “First” milestones cannot be trusted across devices, retries, or repeated callbacks. |
| Medium   | GA setup is configuration-dependent with no automated production smoke check described.                                                                | A missing ID or consent/config problem can silently remove funnel data.              |

### Recommended canonical funnel

Use server truth for durable milestones and client events for views/interactions:

1. `signup_started`
2. `account_created`
3. `consent_viewed`
4. `consent_completed`
5. `setup_hub_viewed`
6. `integration_connect_started`
7. `integration_connected`
8. `initial_sync_started`
9. `first_data_imported`
10. `first_value_viewed`
11. `onboarding_completed`

`onboarding_completed` should mean the user has seen a personalized result, not merely accepted terms or connected an account.

### Event contract

Use consistent snake_case names and parameters. Do not send names, email addresses, provider account identifiers, workout titles, free text, or health values to GA4.

| Event                         | Source of truth                                                              | Required parameters                                                |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `signup_started`              | Client, immediately before OAuth                                             | `method`, `entry_point`, `referral_type`, `experiment_variant`     |
| `signup_failed`               | Client callback/error state                                                  | `method`, `failure_stage`, `error_code` (allowlisted)              |
| `account_created`             | Auth `createUser` event via server-side measurement or one-time client claim | `method`, `entry_point`, `referral_type`                           |
| `consent_viewed`              | Consent page                                                                 | `terms_version`, `privacy_version`                                 |
| `consent_completed`           | Successful consent API response                                              | `terms_version`, `privacy_version`, `seconds_since_view`           |
| `setup_hub_viewed`            | Guided setup hub                                                             | `current_step`, `resume`, `signup_method`                          |
| `integration_connect_started` | Provider CTA                                                                 | `provider`, `surface`, `signup_method`                             |
| `integration_connect_failed`  | OAuth callback/API failure                                                   | `provider`, `failure_stage`, `error_code`                          |
| `integration_connected`       | Successful persisted integration                                             | `provider`, `is_first`, `seconds_since_account_created`            |
| `initial_sync_started`        | Background job accepted                                                      | `provider`                                                         |
| `initial_sync_completed`      | Background job success                                                       | `provider`, `duration_bucket`, `records_bucket`, `has_usable_data` |
| `initial_sync_failed`         | Background job terminal failure                                              | `provider`, `error_code`, `retryable`                              |
| `first_data_imported`         | First persisted usable record                                                | `data_type`, `provider`, `hours_since_account_created`             |
| `first_value_viewed`          | User views a populated personalized insight                                  | `value_type`, `hours_since_account_created`                        |
| `onboarding_step_viewed`      | Client                                                                       | `step`, `step_index`, `resume`                                     |
| `onboarding_step_completed`   | Durable step success                                                         | `step`, `step_index`, `seconds_on_step`                            |
| `onboarding_help_opened`      | Client                                                                       | `step`, `help_type`                                                |
| `onboarding_completed`        | First-value view plus minimum setup contract                                 | `path`, `provider`, `minutes_to_complete`                          |

For durable first milestones, write a first-occurrence timestamp to the application database or a dedicated product-event table before sending to GA. GA4 alone should not decide whether an event is the user's first.

### GA4 reports to create

1. **Signup funnel by method:** `signup_started → account_created → consent_completed`.
2. **Activation funnel by method/provider:** `account_created → integration_connected → first_data_imported → first_value_viewed`.
3. **Time-to-value distribution:** median and p75 time from account creation to first value, segmented by signup method and provider.
4. **Failure report:** OAuth and sync failures by provider, stage, device category, and app version.
5. **Cohort retention:** D1, D7, and D28 return/core action rates split by whether first value was reached in the first session.
6. **Acquisition quality:** activated accounts per source/medium/campaign/referral—not raw OAuth clicks.

Mark `account_created`, `first_data_imported`, `first_value_viewed`, and `purchase` as GA4 key events. Register only bounded custom dimensions; do not register high-cardinality IDs.

## Code review findings (2026-07-14)

Independent code review confirmed the 2026-07-11 audit and added several items. Status reflects the 2026-07-14 session scope above.

### In scope — implement this session

| ID  | Finding                                                                                                                                                                | Location                                      | Priority             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------- |
| R1  | Fabricated social proof: random pravatar faces, hardcoded "2,412 Athletes Active Today" pulse counter, unattributed testimonial, decorative "Secure 256-bit AES" badge | `app/pages/join.vue`                          | High — trust         |
| R2  | Artificial 1.5s delay before every OAuth signup handler                                                                                                                | `app/pages/join.vue`                          | Medium — conversion  |
| R3  | OAuth errors only `console.error`; `useToast()` instantiated but unused; Google button `loading` never set                                                             | `app/pages/join.vue`                          | Medium               |
| R4  | `sign_up` analytics fires on click, not account creation                                                                                                               | `app/composables/useAnalytics.ts`, `join.vue` | Medium — measurement |
| R5  | Consent redirect drops deep-link destination; onboarding always sends user to `/dashboard`                                                                             | `onboarding.global.ts`, `onboarding.vue`      | Medium               |
| R6  | Middleware dead code (`/api/auth` exemption never runs); `typeof data.value === 'undefined'` guard misfires when session resolves to `null`                            | `app/middleware/onboarding.global.ts`         | Medium               |
| R7  | Consent page hardcoded English; `TOS_VERSION`/`PRIVACY_VERSION` stubbed in page; existing `onboarding` translation namespace unused                                    | `app/pages/onboarding.vue`                    | Low–Medium           |
| R8  | Join page defines i18n keys (`joinTitle`, etc.) but template hardcodes English                                                                                         | `app/pages/join.vue`                          | Low                  |
| R9  | Setup hub ends at "any integration exists" — checklist steps 3–4 never activate; no branching by signup method; no FIT/manual fallback                                 | `dashboard.vue`, `OnboardingView.vue`         | High — conversion    |
| R10 | Inconsistent Intervals paths: hub uses `signIn('intervals')`, settings uses API-key flow; hub CTA emits no `integration_connect_start`                                 | `OnboardingView.vue`, `connect-intervals.vue` | Low                  |
| R11 | Provider cards: nested click targets, WHOOP unavailability only on hover (invisible on mobile), hostname-based disable logic                                           | `OnboardingView.vue`                          | Low–Medium           |
| R12 | No milestone-based recovery emails beyond welcome-at-creation                                                                                                          | email triggers                                | P1 — Phase 3         |

Items R1–R8 and R10–R11 are quick or localized fixes. R4 and R9 map to Phase 1 and Phase 2 of this plan respectively. R12 remains Phase 3.

### Deferred — not this session

| ID  | Finding                                                                           | Location                          | Notes                                                                 |
| --- | --------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------- |
| D1  | Health data ingested on Strava/Intervals signup before health-data consent screen | `server/api/auth/[...].ts`        | Compliance ordering; deferred per product decision                    |
| D2  | `allowDangerousEmailAccountLinking: true` on all OAuth providers                  | `server/api/auth/[...].ts`        | Account-takeover vector via unverified Intervals email; security pass |
| D3  | Consent API writes no audit-log entry with IP/UA/version                          | `server/api/user/consent.post.ts` | GDPR proof enhancement; compliance pass                               |

### Already fixed (verified 2026-07-14)

Consent gate server enforcement and related issues are resolved: [097](../issues/097-onboarding-consent-api-bypass.md), [124](../issues/124-onboarding-consent-save-silent-fail.md), [152](../issues/152-onboarding-blocks-join-callback.md), [295](../issues/295-onboarding-consent-controls-unnamed-ambiguous.md).

## Experience problems and recommended changes

## UI/UX review

This review combines inspection of the rendered consent page at desktop and 390×844 mobile sizes with a source-level review of signup, dashboard onboarding, loading, disabled, and failure states. The current signed-in development session already contains data, so the empty-dashboard onboarding view could not be rendered without altering account state; findings for that view are based on its complete component implementation.

### Overall assessment

The onboarding surfaces are individually polished, but they do not feel like one continuous experience. Signup uses a highly stylized, dark “digital twin” presentation; consent switches to a conventional centered legal card; dashboard onboarding then becomes a large integration marketplace. Copy, hierarchy, progress, and visual language change at each transition.

The most important UX issue is not visual quality—it is state communication. The interface is attractive at rest but does not reliably tell users what they have completed, what Coach Watts is doing, how long it will take, or what outcome they will see next.

### Signup screen

What works:

- The three provider choices are prominent and use recognizable brands.
- “No credit card” and “free forever with optional upgrades” reduce purchase anxiety.
- Login is available for users who reached the wrong auth path.
- Provider signup can reduce steps when the same provider supplies training data.

Friction and risks:

- The headline “Initialize Your Digital Twin” and simulated HRV conversation are visually distinctive but abstract for users who do not yet understand the product. A concrete promise such as “Connect your training data and get today's coaching insight” would set a clearer expectation.
- Google, Strava, and Intervals are presented as equivalent account-creation methods, but their post-signup effort is different. Strava/Intervals can connect data immediately; Google users must choose a provider later.
- Every auth handler intentionally delays OAuth by 1.5 seconds. This makes the primary CTA feel slower and can be mistaken for a failure, especially on mobile or slow networks. Start OAuth immediately and use a loading state only for real latency.
- The animated background, magnetic Google button, mesh movement, uppercase/italic typography, and simulated typing compete with the conversion action. Respect `prefers-reduced-motion` and simplify motion on the signup card.
- **Fabricated social proof (R1):** pravatar placeholder faces, a hardcoded live athlete counter, an unattributed testimonial, and a decorative encryption badge. Remove or replace with real data before any public marketing push.
- Provider value and data coverage are not explained beside the auth choices. Users cannot tell whether choosing Google prevents Strava connection later or why Intervals might be preferable.
- OAuth errors are inconsistent: Google logs the error but shows no toast, while login paths show more explicit failure feedback. Every method needs a stable inline or toast recovery message.
- The current page tracks the click as signup before navigation, reinforcing a UX/measurement mismatch: “I tried” is treated as “I joined.”

Recommended design:

- One benefit-led headline, one short proof statement, and the provider CTAs.
- Label Strava and Intervals as “Create account + connect data”; label Google as “Create account, connect data next.”
- Put secondary product theater below the conversion area on desktop and collapse it on mobile.
- Remove the artificial delay and provide immediate pressed/loading feedback.
- Preserve and show invite/referral context: “Join Coach X's team” should remain visible throughout signup.

### Consent screen

What works:

- The page uses a narrow, readable content width and clear two-card grouping.
- Terms and health-data consent are visually separated.
- The primary action remains disabled until both required choices are active.
- Clicking the visible card text successfully toggles the relevant checkbox.
- At 390 px width there is no horizontal overflow, and the submit button remains a comfortable 56 px high.
- API failure keeps the user on the page and produces an error toast.

Observed UI/UX and accessibility issues:

- At 390×844, the document is roughly 877 px tall. The logo, 72 px headline, explanatory paragraph, and two consent cards push the CTA below the initial viewport. A new user must scroll before seeing how to continue.
- The logo occupies about 107 px of height on mobile and is separated by generous vertical spacing. This is disproportionate on a mandatory gate.
- The native checkbox inputs render at roughly 1×1 px and have no accessible label. The visible `label` elements have no `for` relationship, and the clickable card is a `div` without button/checkbox semantics or keyboard handling. Mouse/touch works, but keyboard and screen-reader behavior is unreliable.
- The two visual cards are clickable but do not communicate that behavior semantically. Focus indication is tied to the hidden control rather than the full card.
- “Welcome to the Future of Training” repeats acquisition messaging at a moment when the user needs a quick, trustworthy explanation of required consent.
- “Enable Health Insights” sounds optional, while the checkbox is mandatory. This can feel coercive or confusing. Use explicit language: “Required health-data consent,” explain why it is necessary, and describe any alternative if the service cannot operate without it.
- The enabled CTA changes from “Accept & Continue” to “Let's Go! 🚀”. A stable, precise label provides better predictability and is easier to track and localize.
- The page is hard-coded in English even though an onboarding translation namespace exists and the rest of the product supports multiple locales.
- Policy version constants live in the page, making the screen vulnerable to showing stale consent language/version metadata.

Recommended design:

- Reduce the mobile logo and top spacing; keep the CTA visible within a typical 844 px viewport.
- Use real labeled `UCheckbox` controls or make each card a keyboard-operable label wrapping its input with a full-card focus ring.
- Add a compact progress cue such as “Step 1 of 3 · Consent,” but visually distinguish compliance progress from product activation.
- Keep CTA copy stable: “Accept and continue to data connection.”
- Localize all copy and source policy versions from shared configuration.
- Add a one-sentence data-use summary and a link to more detail without forcing users to parse dense legal language.

### Dashboard onboarding/setup hub

What works:

- The page leads with connecting data, the necessary prerequisite for personalized value.
- Provider branding and short descriptions reduce recognition effort.
- Intervals has a clear primary CTA and an explanatory outbound link.
- The desktop layout separates connection choices from a visible four-step journey.
- Temporarily unavailable providers have disabled visual states and tooltip explanations.

Friction and risks:

- The page looks like an app marketplace, not a guided onboarding flow. Six choices are visible before the product knows the user's sport, devices, or desired outcome.
- Intervals is described as “Required” and “the core of your AI coach,” while the application considers any integration or imported data sufficient. This contradiction can make Strava/other choices feel second-class or invalid.
- The checklist is decorative rather than functional. It always shows account complete, connect active, and the last two steps disabled—even when OAuth or ingestion state has changed.
- On small screens, the checklist follows the primary card and the full secondary-provider grid. Users may not see the promised journey until after scanning many choices.
- The setup hub disappears as soon as an integration row or any data exists. This produces a sudden transition to a dense dashboard before “AI Analysis” or “First Report” is necessarily complete.
- The first screen does not ask what the user wants, what sport they practice, or which apps they already use. Provider selection requires product knowledge instead of recognition-based guidance.
- Provider cards use a clickable parent plus a nested link/button to the same destination. This duplicates interactive targets, can cause double navigation/event behavior, and creates ambiguous keyboard semantics.
- The Intervals CTA calls authentication directly but does not emit the existing integration-start analytics event. Secondary cards similarly lack onboarding-context events.
- Disabled provider behavior is based partly on hostname/configuration and is only explained after hover. Mobile users cannot hover to discover why an option is unavailable.
- There is no “I don't use these,” FIT upload, “choose later,” or manual-start route visible in this view, even though FIT upload exists elsewhere.
- No expected import time, imported date range, permission explanation, or data-source comparison is shown before OAuth.

Recommended layout:

1. A compact progress header with the current real step and estimated remaining time.
2. One question: “Where is most of your training data?” with recommended choices based on signup method.
3. One primary provider card; put alternatives under “More ways to connect.”
4. A visible fallback: upload a FIT file, connect later, or explain the minimum data needed.
5. After OAuth, replace selection with provider-connected confirmation and live import progress—do not return to the provider grid.
6. Keep a persistent setup card on the real dashboard until the first personalized result is viewed.

### Loading, success, empty, and failure states

Current UX coverage is weakest between provider authorization and useful data:

- OAuth buttons show loading, but users are not told whether the delay is app animation, provider redirect, or a real request.
- Initial provider sync runs in the background without an onboarding-specific progress surface.
- The dashboard initially shows a generic spinner while it fetches integration/profile state.
- Successful connection is inferred from integration status rather than celebrated as a completed step.
- Zero-record imports, expired permissions, partial provider permissions, long-running analysis, and terminal failures do not have dedicated onboarding states.

Required states for each setup step:

| State         | UX requirement                                                       |
| ------------- | -------------------------------------------------------------------- |
| Idle          | Explain benefit, data imported, permissions, and estimated time.     |
| Starting      | Disable duplicate actions and say which provider is opening.         |
| Authorized    | Confirm success and advance progress immediately.                    |
| Importing     | Show current stage, safe-to-leave message, and notification promise. |
| Partial/empty | Explain what was found and offer another source/upload path.         |
| Failed        | Human-readable reason, retry, reconnect, and help path.              |
| Ready         | Reveal the first personalized result with one primary next action.   |

Avoid indefinite spinners. After a short threshold, replace them with explicit progress copy and an alternative action.

### First-value and dashboard transition

The full dashboard has a large navigation surface and many widgets. It is appropriate for an established user but cognitively expensive as the first screen after a successful connection. The transition should use progressive disclosure:

- Show one personalized insight first.
- Explain which data produced it.
- Give one recommended action.
- Then introduce the full dashboard with a short, dismissible orientation.
- Keep secondary setup tasks in a compact checklist rather than blocking the entire dashboard.

The success moment should feel earned and specific: “We analyzed 42 rides from Strava” is stronger than a generic “You're all set,” provided record counts are shown in the product UI and not sent as sensitive/high-cardinality analytics.

### Accessibility and responsive checklist

Before release, verify:

- Every checkbox has a programmatic label and full-card keyboard/focus behavior.
- Nested interactive controls are removed from clickable cards.
- All provider unavailable/error explanations work without hover.
- Loading changes are announced with an appropriate live region.
- Focus moves to the new step/status after OAuth return or inline state replacement.
- Reduced-motion users do not receive magnetic movement, simulated typing, rotating stars, pulse effects, or animated progress dots.
- Provider logos have useful alt text, decorative icons are hidden from assistive technology, and contrast meets WCAG AA.
- 320, 390, 768, 1024, and 1440 px widths have no overflow and preserve the primary CTA near the initial viewport.
- Touch targets are at least 44×44 px; the rendered visible checkbox target, not only the surrounding accidental click area, meets this rule.
- Error states are understandable without color alone.
- The journey remains usable with keyboard-only navigation and 200% zoom.

### UI implementation priority

1. **P0:** Fix checkbox semantics/labels, remove nested card interactions, remove the artificial OAuth delay, and give every OAuth method visible error recovery.
2. **P0:** Replace static checklist states with server-derived progress and add explicit import/failure/empty states.
3. **P0:** Keep the setup journey visible until first value rather than until first connection.
4. **P1:** Simplify provider choice based on signup method and user intent; add upload/manual fallback.
5. **P1:** Build a focused first-insight reveal before the full dashboard.
6. **P1:** Reduce mobile consent height, stabilize CTA copy, and localize the page.
7. **P2:** Unify visual language and tone across signup, consent, setup, and first value; then experiment with copy and layout.

### P0 — Make progress real and preserve it

Replace the static checklist with a persisted state machine:

- Account created
- Consent completed
- Data source connected
- Initial data imported
- First insight ready
- First insight viewed

Render the state from server data. Do not call a user onboarded merely because an integration row exists. Keep a compact “Finish setup” card on the real dashboard until first value is viewed, and allow the user to resume after OAuth, refresh, or another device.

Why: users need a reliable sense of progress, and the business needs a shared, queryable definition of activation.

### P0 — Design the shortest path by signup method

- Intervals/Strava signup: acknowledge that the data source is already connected and go directly to import progress.
- Google signup: ask what the user tracks with, recommend the best matching connection, and explain why it is needed.
- Invite signup: preserve the invite context and complete the coach/team join before continuing the relevant athlete setup.
- No supported provider: offer FIT upload or a useful manual-data path instead of a dead end.

Why: the current generic screen repeats work for provider-signup users and makes Google users choose among products without context.

### P0 — Show import progress and a credible wait state

After connection, show:

- provider connected confirmation;
- what date range is being imported;
- live stages such as connecting, importing, analyzing, and ready;
- an honest time expectation;
- retry/reconnect and diagnostic help on failure;
- permission to leave, with an email/in-app notification when the first insight is ready.

If data is sparse or zero records are returned, explain the minimum required data and offer another provider/upload path.

Why: OAuth success is not value. Background work with no progress creates uncertainty and abandonment.

### P1 — Deliver a deliberate first-value reveal

When usable data is ready, route to one focused insight rather than dropping the user into a dense dashboard. The screen should answer:

1. What did Coach Watts learn?
2. Why does it matter today?
3. What should the athlete do next?

Examples: a concise training-load snapshot, recovery/readiness insight, or recent-workout analysis depending on available data. Provide one primary action such as “Review today's recommendation” and then reveal the broader dashboard.

### P1 — Reduce choice and clarify provider value

- Ask a short intent question: training analysis, recovery, nutrition, or coached plan.
- Recommend one primary provider/path based on that intent and signup method.
- Move less common providers under “More ways to connect.”
- Do not strongly privilege Intervals.icu unless it is genuinely the best conversion path for the selected intent.
- Explain data coverage and typical setup time in plain language.

### P1 — Separate compliance language from product setup

- Rename analytics from `onboarding_view/complete` to `consent_viewed/completed`.
- Keep the consent page short, accessible, and explicit, but tell the user what happens immediately afterward.
- Replace “Let's Go” with a precise continuation such as “Accept and connect training data.”
- Avoid implying that terms acceptance delivers the coaching outcome.

### P1 — Add recovery loops

- Send a contextual reminder only when a durable step is incomplete.
- Deep-link to the exact resume state, with UTMs and `utm_content` by step.
- Suggested cadence: import-ready immediately; incomplete connection after 1 hour; incomplete first-value view after 24 hours; final helpful reminder around day 3.
- Stop reminders immediately after the relevant milestone.

### P2 — Personalize after activation, not before it

Collect only inputs that improve the first result and cannot be inferred: primary sport, goal, and perhaps weekly availability. Defer detailed profile settings until after value is demonstrated.

## Prioritized delivery plan

### Session checklist (2026-07-14)

Use this as the working tracker for the current implementation session.

**Signup (`join.vue`)**

- [x] Remove fabricated social proof (R1)
- [x] Remove 1.5s OAuth delay (R2)
- [x] Add OAuth error toasts for all providers (R3)
- [x] Wire template to existing i18n keys (R8)

**Consent & routing**

- [x] Preserve `redirect` query param through consent gate (R5)
- [x] Fix middleware session guard and remove dead `/api/auth` check (R6)
- [x] Localize consent page; move policy versions to shared config (R7)

**Analytics (Phase 1)**

- [x] Rename click intent to `signup_started`; add `signup_failed`
- [x] Emit `account_created` server-side on first OAuth link (idempotent audit log + GA4 MP/client claim)
- [x] Rename `onboarding_view`/`onboarding_complete` → `consent_viewed`/`consent_completed`
- [x] Add setup-hub and integration CTA events (R4, R10)
- [x] Update [analytics-tracking.md](../04-guides/analytics-tracking.md) event tables

**Guided setup (Phase 2 MVP)**

- [x] Server-derived onboarding status (replace broad `isOnboarded` boolean)
- [x] Live checklist tied to sync/analysis state (R9)
- [x] Branch by signup method (Strava/Intervals vs Google)
- [x] Import progress, empty, and failure states
- [x] FIT/manual fallback and "connect later"
- [x] Fix provider card semantics; surface unavailable providers on mobile (R11)
- [x] Align Intervals hub CTA with chosen connect path and analytics (R10)

**Deferred (do not implement this session)**

- [ ] D1 — Gate ingestion on `healthConsentAcceptedAt`
- [ ] D2 — Harden OAuth account linking
- [ ] D3 — Consent audit-log proof fields

### Phase 0 — Baseline and definitions (2–3 days)

- Agree on the activation contract: `first_value_viewed` within 24 hours.
- Document the exact eligible first-value screens and minimum usable-data rule.
- Preserve acquisition fields through OAuth (`utm_*`, referrer, invite/referral, entry point) in a short-lived first-party cookie/server state.
- Build a baseline from application data: account creation, consent timestamp, first integration, first workout/wellness/nutrition record, first meaningful app action, and D1/D7 return.
- Validate that GA4 is receiving production events in DebugView/Realtime and that user identity is set after auth.

Deliverable: baseline dashboard and an agreed metric dictionary.

### Phase 1 — Repair instrumentation (3–5 days)

- Replace pre-OAuth `sign_up` with `signup_started`.
- Emit `account_created` only after actual user creation; include an idempotency strategy.
- Rename the consent events and add timing/version fields.
- Track every onboarding provider CTA and callback failure.
- Emit durable first integration, first data, sync success/failure, and first-value events.
- Add automated analytics unit tests for event names/parameters and a production smoke check.
- Configure GA4 key events, custom dimensions, funnel explorations, and internal/developer traffic filters.

Deliverable: a trustworthy end-to-end funnel segmented by method/provider/source.

### Phase 2 — Guided setup MVP (5–8 days)

- Introduce a server-derived onboarding status endpoint or extend an appropriate profile/status endpoint.
- Replace the static checklist with live, resumable progress.
- Branch the journey for Google versus provider signup.
- Add connection success, sync progress, zero-data, failure/retry, and safe-leave states.
- Retain a compact setup card until first value; do not replace the entire dashboard once partial data exists.
- Add FIT/manual fallback and “connect another source” recovery where supported.

Deliverable: users always know their current state, next action, and whether Coach Watts is still working.

### Phase 3 — First-value reveal and lifecycle recovery (4–7 days)

- Define a deterministic best first insight based on available data.
- Create the focused first-value reveal and primary next action.
- Notify users when processing completes if they leave.
- Add milestone-based resume emails/in-app messages and suppression rules.
- Ensure welcome email links to the actual current onboarding state rather than a generic destination.

Deliverable: the onboarding endpoint is a coaching outcome, not an integration connection.

### Phase 4 — Experiment and optimize (ongoing, minimum 2-week reads)

Run one material experiment at a time, pre-registering primary and guardrail metrics:

1. Intent-first provider recommendation vs. provider grid.
2. Focused first-value reveal vs. immediate full dashboard.
3. Embedded setup progress vs. full-screen setup takeover.
4. Import-ready notification plus resume link vs. no notification.

Primary metric: D1 `first_value_viewed` per `account_created`.  
Guardrails: OAuth completion, consent completion, sync failure, support contacts, D7 retained core action, and paid conversion.

## Initial targets

Establish the baseline before committing externally. For the first two release cycles, use directional product targets:

- Reduce median account-created-to-first-value time by at least 30%.
- Improve account-created-to-first-integration conversion by 15% relative.
- Improve account-created-to-D1-first-value conversion by 20% relative.
- Reduce connected-but-no-usable-data users by 25% relative.
- Keep consent completion no worse than baseline minus 2 percentage points.
- Achieve at least 95% agreement between application milestone counts and GA4 event counts after known filters/delays.

## Weekly operating dashboard

Review one cohort table each week:

| Cohort metric               | Overall | Google | Strava | Intervals | Invite | Other |
| --------------------------- | ------: | -----: | -----: | --------: | -----: | ----: |
| Accounts created            |         |        |        |           |        |       |
| Consent completed           |         |        |        |           |        |       |
| First integration connected |         |        |        |           |        |       |
| First usable data imported  |         |        |        |           |        |       |
| First value viewed in 24h   |         |        |        |           |        |       |
| D7 retained core action     |         |        |        |           |        |       |
| Paid by D30                 |         |        |        |           |        |       |
| Median time to first value  |         |        |        |           |        |       |

Also review the top failure reason at each transition and inspect a small sample of affected user timelines. Avoid optimizing raw signup clicks; optimize activated and retained accounts.

## Implementation map

### This session

| File                                          | Changes                                                                             |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `app/pages/join.vue`                          | Remove fake social proof; remove OAuth delay; error toasts; i18n; `signup_started`  |
| `app/middleware/onboarding.global.ts`         | Fix session guard; preserve `redirect`; remove dead `/api/auth` check               |
| `app/pages/onboarding.vue`                    | i18n; shared policy versions; honor `redirect` after consent; `consent_*` events    |
| `app/composables/useAnalytics.ts`             | Canonical funnel helpers; deprecate misleading `sign_up` on click                   |
| `server/api/auth/[...].ts`                    | **`account_created` event only** — no ingestion or linking changes (D1/D2 deferred) |
| `app/components/dashboard/OnboardingView.vue` | Live progress, provider UX fixes, analytics on CTAs, mobile unavailable states      |
| `app/pages/dashboard.vue`                     | Replace `isOnboarded` with explicit setup/activation status from server             |
| `shared/` or `app/config/`                    | Central `TOS_VERSION` / `PRIVACY_VERSION` constants                                 |
| `docs/04-guides/analytics-tracking.md`        | Align event tables with Phase 1 funnel                                              |

### Later phases (unchanged scope)

- Integration OAuth callbacks and Trigger.dev ingestion jobs: durable connection/sync/data milestones (ingestion ordering unchanged until D1 is approved).
- Welcome/lifecycle email triggers: exact resume deep links and milestone-based suppression (Phase 3).
- `app/pages/connect-intervals.vue`: reconcile with hub Intervals path once connect strategy is chosen (R10).

## Risks and safeguards

- **Known compliance gap (deferred):** Strava/Intervals signup still triggers background ingestion before the health-data consent screen (D1). This session intentionally does not change that behavior. Track separately; do not regress signup or sync for existing users when D1 is eventually implemented.
- **Health-data privacy:** analytics events must describe states and categories, never health values or user-entered text.
- **Duplicate events:** callbacks and jobs retry; milestone writes and emissions must be idempotent.
- **GA blockers:** use application data as the business source of truth and GA4 for behavioral analysis.
- **Sparse data:** do not promise an insight the available provider/data cannot produce; provide a clear fallback.
- **Provider differences:** evaluate each signup path independently; combined averages will hide path-specific failures.
- **Premature monetization:** do not interrupt the path to first value with upgrade prompts unless the selected capability truly requires payment.

## Definition of done

The onboarding improvement is complete when:

- a new user's state survives refresh, OAuth redirects, and device changes;
- every screen has one clear primary next action;
- users can see connection/import progress and recover from failures;
- onboarding ends only after a personalized value is viewed;
- application records and GA4 can reproduce the same stage counts within an agreed tolerance;
- method/provider/source segmented D1 activation and D7 retention are reviewed weekly;
- lifecycle messages resume the exact incomplete step and stop after completion.
