# App Review — Issue Tracker

Last reviewed: 2026-07-18 (issues 324–325 — public documentation gaps)

Documents app-wide issues **039–322** from systematic codebase and live UI review. Complements structure-generation tracker [issues.md](./issues.md) (001–038, **37 / 38 fixed**).

**Progress:** [REVIEW-PROGRESS.md](./REVIEW-PROGRESS.md) (~96% complete)

**Postponed:** 21 issues deferred (auth, webhooks, OAuth, Yazio credential storage) — ingest/integration flows unchanged until coordinated.

## Summary by priority

| Priority | Count (039–322) | Active (status Open) |
| -------- | --------------- | -------------------- |
| Critical | 7               | 3                    |
| High     | 73              | 24                   |
| Medium   | 168             | 57                   |
| Low      | 36              | 7                    |

## Top clusters (fix these first)

### P0 — Critical runtime & security (active)

| ID                                                               | Title                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------- |
| [062](./062-chat-planned-workout-pollstartedat-crash.md)         | ~~Chat planned-workout card `pollStartedAt` crash~~ **Fixed** |
| [263](./263-public-share-invite-single-use.md)                   | Public coaching-share invite is single-use                    |
| [312](./312-garmin-activity-file-callback-token-exfiltration.md) | Garmin callback can exfiltrate access tokens                  |
| [313](./313-garmin-webhook-multi-user-batch-misrouting.md)       | Garmin multi-user webhook batches are misrouted               |
| ~~[069](./069-garmin-webhook-unauthenticated.md)~~               | Garmin webhook — **Postponed**                                |
| ~~[058](./058-oauth-refresh-weak-client-binding.md)~~            | OAuth refresh — **Postponed**                                 |

### P1 — High-impact user flows

| ID                                                                                                             | Title                                                      |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [064](./064-workout-detail-stale-on-nav.md) / [065](./065-planned-workout-stale-on-nav.md)                     | ~~Workout pages stale on neighbor navigation~~ **Fixed**   |
| [067](./067-nutrition-estimate-missing-id.md)                                                                  | ~~Nutrition estimate days break mutations~~ **Fixed**      |
| [068](./068-coaching-overview-wrong-workout-links.md)                                                          | ~~Coaching feed links wrong workout route~~ **Fixed**      |
| [076](./076-analytics-dashboard-autosave-silent-fail.md)                                                       | ~~Analytics dashboard save fails silently~~ **Fixed**      |
| [131](./131-feed-load-more-never-refetches.md)                                                                 | ~~Feed pagination broken~~ **Fixed**                       |
| [134](./134-activities-sync-spinner-stuck.md)                                                                  | ~~Activities sync spinner stuck~~ **Fixed**                |
| [145](./145-logout-no-pinia-store-reset.md)                                                                    | ~~Logout doesn't reset stores~~ **Fixed**                  |
| [147](./147-user-store-cache-blocks-refetch.md)                                                                | ~~User store cache blocks refetch after switch~~ **Fixed** |
| [152](./152-onboarding-blocks-join-callback.md)                                                                | ~~Onboarding blocks post-signup join~~ **Fixed**           |
| [171](./171-ingest-hevy-no-date-window.md) / [172](./172-garmin-ingest-clamps-24h-window.md)                   | ~~Ingest date window bugs~~ **Fixed**                      |
| [174](./174-garmin-ingest-silent-noop-missing-integration.md)                                                  | ~~Garmin silent noop missing integration~~ **Fixed**       |
| [175](./175-wellness-analysis-no-quota-check.md) / [177](./177-recommend-today-processing-stuck-on-failure.md) | ~~AI quota / stuck PROCESSING~~ **Fixed**                  |
| [187](./187-profile-tab-unmount-popper-crash.md)                                                               | ~~Profile settings popper crash (Sentry 18A)~~ **Fixed**   |
| [190](./190-autodetect-drops-ftp-hr-thresholds.md)                                                             | ~~Autodetect drops FTP/HR thresholds~~ **Fixed**           |
| [197](./197-connected-apps-hides-failed-status.md)                                                             | ~~Connected apps hides FAILED integrations~~ **Fixed**     |
| [314](./314-garmin-refresh-token-rotation-races.md)                                                            | Garmin refresh token rotation is race-prone                |
| [315](./315-garmin-disabled-fetches-hide-requested-failure.md)                                                 | Disabled Garmin fetches hide requested-data failure        |

**Earlier active high issues (039–218):** [040](./040-billing-success-without-activation.md), [056](./056-orchestrate-progress-key-mismatch.md), [139](./139-fitness-index-90-day-api-cap.md), [144](./144-admin-issue-reactions-no-admin-check.md), [161](./161-connect-yazio-no-auth-middleware.md), [162](./162-fit-ingest-no-file-ownership-check.md)

### P2 — Recurring pattern: stuck loading spinners

039, 049–051, 073–074, 080–082, 119, 138, 216 — ~~all need `onTaskFailed` handlers~~ **Fixed**.

### P3 — Webhook & integration security (postponed)

059, 069, 072, 098, 099, 100, 101, 105, 058, 071, 093, 094, 110, 111, 125, 126, 129, 063, 102 — **deferred** until third-party/provider coordination. Ingest-safe fixes (060, 106, 108, 171–172, 175, 177, 197 fixed). **057 fixed** (admin guard on debug routes).

---

## Postponed: auth & third-party (deferred)

> Do not implement until provider webhooks, OAuth apps, or ops config are aligned. Risk: breaking ingest or integration flows.

| ID                                                       | Title                                       |
| -------------------------------------------------------- | ------------------------------------------- |
| [058](./058-oauth-refresh-weak-client-binding.md)        | OAuth refresh weak binding                  |
| [059](./059-withings-webhook-unauthenticated.md)         | Withings webhook unauthenticated            |
| [063](./063-admin-queue-api-unauthenticated.md)          | Admin queue API unauthenticated             |
| [069](./069-garmin-webhook-unauthenticated.md)           | Garmin webhook unauthenticated              |
| [071](./071-oauth-auth-code-ignores-redirect-uri.md)     | OAuth redirect_uri ignored                  |
| [072](./072-whoop-async-webhook-auth-bypass.md)          | Whoop async webhook bypass                  |
| [094](./094-share-generate-workout-read-all-types.md)    | Share-generate scope escalation             |
| [098](./098-polar-webhook-missing-userid.md)             | Polar webhook missing userId                |
| [099](./099-oauth-generic-webhook-ignores-secret.md)     | OAuth generic webhook ignores secret        |
| [100](./100-strava-webhook-post-unauthenticated.md)      | Strava POST unauthenticated                 |
| [101](./101-wahoo-webhook-auth-optional.md)              | Wahoo webhook auth optional                 |
| [102](./102-monitoring-trigger-public-without-secret.md) | Monitoring endpoint public                  |
| [105](./105-withings-webhook-no-idempotency.md)          | Withings webhook no idempotency             |
| [110](./110-oauth-login-open-redirect.md)                | OAuth login open redirect                   |
| [111](./111-oauth-consent-csrf.md)                       | OAuth consent CSRF                          |
| [125](./125-oauth-dangerous-email-account-linking.md)    | Dangerous email linking                     |
| [126](./126-oauth-authorize-no-scope-validation.md)      | OAuth no scope validation                   |
| [129](./129-oauth-revoke-no-client-auth.md)              | OAuth revoke no client auth                 |
| [070](./070-yazio-password-plaintext-storage.md)         | Yazio password plaintext (accepted for now) |
| [158](./158-developer-get-leaks-webhook-secret.md)       | Developer GET leaks webhook secret          |

---

### P4 — Share/privacy over-exposure (active)

~~066, 095–096, 135–137, 155–160, 157~~ — **Fixed** (PR 7; 158 postponed)

---

| ID                                                      | Title                                           | Priority | Type        |
| ------------------------------------------------------- | ----------------------------------------------- | -------- | ----------- |
| [039](./039-dashboard-sync-stuck-loading.md)            | Dashboard sync stuck loading                    | High     | Bug         |
| [040](./040-billing-success-without-activation.md)      | Billing success without activation              | High     | Bug         |
| [041](./041-workout-comparison-cross-user-leak.md)      | ~~Comparison basket cross-user leak~~ **Fixed** | High     | Bug         |
| [042](./042-non-intervals-today-workouts-skipped.md)    | Non-Intervals today workouts skipped            | Medium   | Bug         |
| [043](./043-fit-upload-spurious-toasts.md)              | FIT upload spurious toasts                      | Medium   | Bug         |
| [044](./044-wellness-modal-error-as-empty.md)           | ~~Wellness modal error as empty~~ **Fixed**     | Medium   | UI          |
| [045](./045-wellness-modal-dialog-title-a11y.md)        | Wellness modal a11y title                       | Low      | UI          |
| [046](./046-profile-settings-stale-on-fail.md)          | ~~Profile stale on failed save~~ **Fixed**      | Medium   | Bug         |
| [047](./047-support-email-html-injection.md)            | Support email HTML injection                    | Medium   | Bug         |
| [048](./048-recovery-history-no-error-ui.md)            | ~~Recovery history no error UI~~ **Fixed**      | Medium   | UI          |
| [049](./049-performance-insights-stuck-loading.md)      | Performance insights stuck                      | Medium   | Bug         |
| [050](./050-reports-generating-stuck-on-failure.md)     | Reports generating stuck                        | Medium   | Bug         |
| [051](./051-recommendations-update-stuck-loading.md)    | Recommendations update stuck                    | Medium   | Bug         |
| [052](./052-notification-errors-swallowed.md)           | ~~Notification errors swallowed~~ **Fixed**     | Medium   | UI          |
| [053](./053-notification-mark-read-race.md)             | Notification mark-read race                     | Low      | Bug         |
| [054](./054-use-polling-aborts-on-error.md)             | ~~usePolling aborts on error~~ **Fixed**        | Medium   | Bug         |
| [055](./055-communication-prefs-misleading-defaults.md) | Communication prefs defaults                    | Medium   | UI          |
| [056](./056-orchestrate-progress-key-mismatch.md)       | Orchestrate SSE key mismatch                    | High     | Bug         |
| [057](./057-unauthenticated-debug-endpoints.md)         | Unauthenticated debug endpoints (fixed)         | High     | Bug         |
| [058](./058-oauth-refresh-weak-client-binding.md)       | OAuth refresh weak binding                      | Critical | Bug         |
| [059](./059-withings-webhook-unauthenticated.md)        | Withings webhook unauthenticated                | High     | Bug         |
| [060](./060-integration-syncstatus-stuck.md)            | syncStatus stuck SYNCING                        | Medium   | Bug         |
| [061](./061-i18n-gaps-secondary-pages.md)               | i18n gaps secondary pages (partial)             | Low      | Maintenance |

---

## Issues 062–090 (workouts, chat, nutrition, coaching)

| ID                                                       | Title                                         | Priority |
| -------------------------------------------------------- | --------------------------------------------- | -------- |
| [062](./062-chat-planned-workout-pollstartedat-crash.md) | ~~Chat pollStartedAt crash~~ **Fixed**        | Critical |
| [063](./063-admin-queue-api-unauthenticated.md)          | Admin queue API unauthenticated               | High     |
| [064](./064-workout-detail-stale-on-nav.md)              | ~~Workout detail stale on nav~~ **Fixed**     | High     |
| [065](./065-planned-workout-stale-on-nav.md)             | ~~Planned workout stale on nav~~ **Fixed**    | High     |
| [066](./066-public-workout-share-raw-id-fallback.md)     | Share raw workout ID fallback                 | High     |
| [067](./067-nutrition-estimate-missing-id.md)            | Nutrition estimate missing id                 | High     |
| [068](./068-coaching-overview-wrong-workout-links.md)    | Coaching feed wrong links                     | High     |
| [069](./069-garmin-webhook-unauthenticated.md)           | Garmin webhook unauthenticated                | Critical |
| [070](./070-yazio-password-plaintext-storage.md)         | Yazio password plaintext                      | High     |
| [071](./071-oauth-auth-code-ignores-redirect-uri.md)     | OAuth ignores redirect_uri                    | High     |
| [072](./072-whoop-async-webhook-auth-bypass.md)          | Whoop async webhook bypass                    | High     |
| [073](./073-workouts-index-analyze-stuck-loading.md)     | Workouts index analyze stuck                  | High     |
| [074](./074-workout-detail-analysis-stuck-loading.md)    | Workout detail analysis stuck                 | High     |
| [075](./075-nutrition-hydration-advice-inverted.md)      | Hydration advice inverted                     | Medium   |
| [076](./076-analytics-dashboard-autosave-silent-fail.md) | Analytics autosave silent fail                | High     |
| [077](./077-chat-load-errors-empty-state.md)             | Chat load errors empty                        | Medium   |
| [078](./078-library-chat-deeplink-istemplate-ignored.md) | Library chat isTemplate ignored               | Medium   |
| [079](./079-chat-tool-approval-stuck-on-failure.md)      | Tool approval stuck                           | Medium   |
| [080](./080-plan-dashboard-tasks-no-ontaskfailed.md)     | Plan dashboard no onTaskFailed                | Medium   |
| [081](./081-nutrition-history-analyze-stuck-loading.md)  | Nutrition history analyze stuck               | Medium   |
| [082](./082-meal-recommendation-modal-stuck-loading.md)  | Meal modal stuck loading                      | Medium   |
| [083](./083-nutrition-detail-analyze-no-ui-refresh.md)   | ~~Nutrition analyze no UI refresh~~ **Fixed** | Medium   |
| [084](./084-nutrition-detail-back-wrong-route.md)        | ~~Nutrition back wrong route~~ **Fixed**      | Medium   |
| [085](./085-coaching-team-delete-stub.md)                | Team delete stub                              | Medium   |
| [086](./086-library-plan-delete-stub.md)                 | Library plan delete stub                      | Medium   |
| [087](./087-library-workout-use-session-stub.md)         | Library use session stub                      | Medium   |
| [088](./088-workout-matcher-silent-link-errors.md)       | ~~WorkoutMatcher silent errors~~ **Fixed**    | Medium   |
| [089](./089-planned-workout-error-as-not-found.md)       | ~~Planned error as not found~~ **Fixed**      | Medium   |
| [090](./090-workouts-mobile-analyze-labeled-sync.md)     | Mobile analyze labeled Sync                   | Medium   |

## Issues 091–120 (workouts, oauth, webhooks, plans, library)

| ID                                                        | Title                                          | Priority |
| --------------------------------------------------------- | ---------------------------------------------- | -------- |
| [091](./091-workouts-overall-quality-wrong-metric-key.md) | Overall quality wrong metric                   | Medium   |
| [092](./092-workout-analysis-toast-no-run-correlation.md) | Analysis toast no correlation                  | Medium   |
| [093](./093-oauth-userinfo-email-ignores-scopes.md)       | userinfo email ignores scopes                  | Medium   |
| [094](./094-share-generate-workout-read-all-types.md)     | Share generate scope escalation                | Medium   |
| [095](./095-plan-share-auto-creates-permanent-tokens.md)  | Plan share auto-creates tokens                 | Medium   |
| [096](./096-join-invite-preview-exposes-pii.md)           | Join preview exposes PII                       | Medium   |
| ~~[097](./097-onboarding-consent-api-bypass.md)~~         | Onboarding consent bypass (fixed)              | Medium   |
| [098](./098-polar-webhook-missing-userid.md)              | Polar webhook missing userId                   | High     |
| [099](./099-oauth-generic-webhook-ignores-secret.md)      | OAuth webhook ignores secret                   | High     |
| [100](./100-strava-webhook-post-unauthenticated.md)       | Strava POST unauthenticated                    | High     |
| [101](./101-wahoo-webhook-auth-optional.md)               | Wahoo auth optional                            | High     |
| [102](./102-monitoring-trigger-public-without-secret.md)  | Monitoring public without secret               | High     |
| [103](./103-health-endpoint-leaks-db-errors.md)           | Health leaks DB errors                         | Medium   |
| [104](./104-stripe-webhook-echoes-errors.md)              | Stripe webhook echoes errors                   | Medium   |
| [105](./105-withings-webhook-no-idempotency.md)           | Withings no idempotency                        | Medium   |
| [106](./106-sync-queue-duplicate-processing.md)           | Sync queue duplicates (fixed)                  | Medium   |
| [107](./107-webhook-poller-double-enqueue.md)             | Webhook poller double enqueue                  | Medium   |
| [108](./108-integration-sync-no-inflight-guard.md)        | Sync no in-flight guard (fixed)                | Medium   |
| [109](./109-deactivated-users-pass-client-middleware.md)  | Deactivated users pass middleware              | Medium   |
| [110](./110-oauth-login-open-redirect.md)                 | OAuth login open redirect                      | Medium   |
| [111](./111-oauth-consent-csrf.md)                        | OAuth consent CSRF                             | Medium   |
| [112](./112-map-gpx-download-silent-failure.md)           | ~~Map GPX silent failure~~ **Fixed**           | Medium   |
| [113](./113-workout-export-apis-require-email.md)         | Export APIs require email                      | Medium   |
| [114](./114-nutrition-history-trends-silent-fail.md)      | ~~Nutrition trends silent fail~~ **Fixed**     | Medium   |
| [115](./115-coaching-calendar-fetch-unhandled.md)         | ~~Coaching calendar unhandled~~ **Fixed**      | Medium   |
| [116](./116-coaching-message-athlete-no-context.md)       | Message athlete no context                     | Medium   |
| [117](./117-plan-wizard-after-failed-abandon.md)          | Plan wizard after failed abandon               | Medium   |
| [118](./118-plan-creation-polling-no-failure-feedback.md) | ~~Plan polling no failure feedback~~ **Fixed** | Medium   |
| [119](./119-library-workout-structure-no-ontaskfailed.md) | Library structure no onTaskFailed              | Medium   |
| [120](./120-library-workout-fetch-error-as-not-found.md)  | ~~Library fetch as not found~~ **Fixed**       | Medium   |

## Issues 121–150 (library, feed, fitness, stores)

| ID                                                           | Title                                         | Priority |
| ------------------------------------------------------------ | --------------------------------------------- | -------- |
| [121](./121-library-plan-folder-errors-swallowed.md)         | ~~Library folder errors swallowed~~ **Fixed** | Medium   |
| [122](./122-workout-comparison-fetch-failure-hidden.md)      | ~~Comparison fetch failure hidden~~ **Fixed** | Medium   |
| [123](./123-chat-deeplink-bypasses-turn-queue.md)            | Chat deeplink bypasses queue                  | Medium   |
| [124](./124-onboarding-consent-save-silent-fail.md)          | Onboarding consent silent fail                | Medium   |
| [125](./125-oauth-dangerous-email-account-linking.md)        | Dangerous email linking                       | High     |
| [126](./126-oauth-authorize-no-scope-validation.md)          | OAuth no scope validation                     | Medium   |
| [127](./127-polar-ingest-skips-syncstatus.md)                | Polar skips syncStatus                        | Medium   |
| [128](./128-trigger-is-task-running-fails-open.md)           | isTaskRunning fails open                      | Medium   |
| [129](./129-oauth-revoke-no-client-auth.md)                  | OAuth revoke no client auth                   | Medium   |
| [130](./130-planned-charts-error-as-not-found.md)            | ~~Planned charts not found~~ **Fixed**        | Medium   |
| [131](./131-feed-load-more-never-refetches.md)               | Feed load more broken                         | High     |
| [132](./132-feed-sport-filter-wrong-type.md)                 | Feed sport filter wrong type                  | Medium   |
| [133](./133-feed-errors-empty-state.md)                      | Feed errors empty state                       | Medium   |
| [134](./134-activities-sync-spinner-stuck.md)                | Activities sync spinner stuck                 | High     |
| [135](./135-activities-modal-fetch-silent-fail.md)           | ~~Activities modal silent fail~~ **Fixed**    | Medium   |
| [136](./136-activities-columns-cross-user.md)                | ~~Activities columns cross-user~~ **Fixed**   | Medium   |
| [137](./137-activities-workout-matcher-unreachable.md)       | WorkoutMatcher unreachable                    | Medium   |
| [138](./138-fitness-detail-analyze-stuck.md)                 | Fitness analyze stuck                         | High     |
| [139](./139-fitness-index-90-day-api-cap.md)                 | Fitness 90-day API cap                        | High     |
| [140](./140-fitness-filter-empty-page.md)                    | Fitness filter empty page                     | Low      |
| [141](./141-events-detail-stale-on-nav.md)                   | ~~Events stale on nav~~ **Fixed**             | Medium   |
| [142](./142-event-priority-none-invalid.md)                  | Event priority NONE invalid                   | Medium   |
| [143](./143-admin-subscriptions-missing-admin-middleware.md) | Admin subscriptions no middleware             | Medium   |
| [144](./144-admin-issue-reactions-no-admin-check.md)         | Admin reactions no admin check                | High     |
| [145](./145-logout-no-pinia-store-reset.md)                  | ~~Logout no store reset~~ **Fixed**           | High     |
| [146](./146-logout-library-folders-not-cleared.md)           | ~~Logout folders not cleared~~ **Fixed**      | Medium   |
| [147](./147-user-store-cache-blocks-refetch.md)              | ~~User store cache blocks refetch~~ **Fixed** | High     |
| [148](./148-recommendations-adhoc-spinner-stuck.md)          | Ad-hoc workout spinner stuck                  | Medium   |
| [149](./149-folder-refresh-silent-stale.md)                  | ~~Folder refresh silent stale~~ **Fixed**     | Medium   |
| [150](./150-recommendations-stale-on-404.md)                 | Recommendations stale on 404                  | Medium   |

## Issues 151–170 (join, share, developer, triggers)

| ID                                                     | Title                                       | Priority |
| ------------------------------------------------------ | ------------------------------------------- | -------- |
| [151](./151-user-profile-stale-on-error.md)            | User profile stale on error                 | Medium   |
| ~~[152](./152-onboarding-blocks-join-callback.md)~~    | Onboarding blocks join (fixed)              | High     |
| ~~[153](./153-join-auto-accept-branded-only.md)~~      | Join auto-accept branded only (fixed)       | Medium   |
| ~~[154](./154-join-accept-errors-return-500.md)~~      | Join accept returns 500 (fixed)             | Medium   |
| [155](./155-workout-share-leaks-zone-profiles.md)      | Share leaks zone profiles                   | High     |
| [156](./156-nutrition-share-url-404.md)                | Nutrition share URL 404                     | Medium   |
| [157](./157-nutrition-share-unsanitized-payload.md)    | Nutrition share unsanitized                 | High     |
| [158](./158-developer-get-leaks-webhook-secret.md)     | Developer GET leaks secret                  | High     |
| [159](./159-planned-workout-share-ignores-preview.md)  | Planned share ignores preview               | Medium   |
| [160](./160-wellness-share-og-leaks-biometrics.md)     | Wellness OG leaks biometrics                | Medium   |
| [161](./161-connect-yazio-no-auth-middleware.md)       | Connect Yazio no auth                       | High     |
| [162](./162-fit-ingest-no-file-ownership-check.md)     | FIT ingest no ownership check               | High     |
| [163](./163-chat-tts-transcribe-no-quota.md)           | Chat TTS/transcribe no quota                | Medium   |
| [164](./164-chat-turn-retry-no-quota.md)               | Chat retry no quota                         | Medium   |
| [165](./165-chat-queued-messages-lost-on-error.md)     | Queued messages lost on error               | Medium   |
| [166](./166-chat-message-queue-in-memory-only.md)      | Chat queue in-memory only                   | Medium   |
| [167](./167-admin-impersonate-self-allowed.md)         | ~~Admin impersonate self~~ **Fixed**        | Medium   |
| [168](./168-admin-user-detail-no-error-state.md)       | ~~Admin user detail no error~~ **Fixed**    | Medium   |
| [169](./169-admin-webhook-stats-wrong-progress-max.md) | ~~Admin webhook stats wrong max~~ **Fixed** | Low      |
| [170](./170-deduplicate-auto-analyzes-all-recent.md)   | Dedup auto-analyzes all recent              | Medium   |

## Issues 171–185 (trigger tasks deep pass)

| ID                                                            | Title                                    | Priority |
| ------------------------------------------------------------- | ---------------------------------------- | -------- |
| [171](./171-ingest-hevy-no-date-window.md)                    | Hevy ingest no date window (fixed)       | High     |
| [172](./172-garmin-ingest-clamps-24h-window.md)               | Garmin ingest clamps to 24h (fixed)      | High     |
| [173](./173-wahoo-ingest-capped-100-workouts.md)              | Wahoo capped at 100 workouts             | Medium   |
| [174](./174-garmin-ingest-silent-noop-missing-integration.md) | Garmin silent noop (fixed)               | Medium   |
| [175](./175-wellness-analysis-no-quota-check.md)              | Wellness analysis no quota (fixed)       | High     |
| [176](./176-recommend-today-inline-wellness-no-quota.md)      | Recommend-today inline wellness no quota | High     |
| [177](./177-recommend-today-processing-stuck-on-failure.md)   | Recommend-today PROCESSING stuck (fixed) | High     |
| [178](./178-ingest-all-auto-readiness-no-idempotency.md)      | Ingest-all auto-readiness no idempotency | Medium   |
| [179](./179-generate-recommendations-no-quota.md)             | Generate-recommendations no quota        | Medium   |
| [180](./180-generate-recommendations-double-ai-call.md)       | Generate-recommendations double AI call  | Medium   |
| [181](./181-analyze-plan-adherence-no-quota-timeout.md)       | Plan adherence no quota/timeout          | Medium   |
| [182](./182-analyze-wellness-no-ownership-check.md)           | Analyze-wellness no ownership check      | Medium   |
| [183](./183-send-email-dispatch-failure-no-retry.md)          | Send-email dispatch no retry             | Medium   |
| [184](./184-send-email-no-max-duration.md)                    | Send-email no maxDuration                | Low      |
| [185](./185-ingest-all-sync-queue-fire-and-forget.md)         | Ingest-all sync queue fire-and-forget    | Medium   |

## Issues 186–198 (profile/settings + Sentry)

| ID                                                        | Title                                             | Priority |
| --------------------------------------------------------- | ------------------------------------------------- | -------- |
| [186](./186-profile-tab-url-not-synced.md)                | ~~Profile tab URL not synced~~ **Fixed**          | Medium   |
| [187](./187-profile-tab-unmount-popper-crash.md)          | ~~Profile tab popper crash (18A)~~ **Fixed**      | High     |
| [188](./188-sport-settings-warning-no-revert.md)          | ~~Sport settings warning no revert~~ **Fixed**    | Medium   |
| [189](./189-profile-watcheffect-clobbers-edits.md)        | ~~Profile watchEffect clobbers edits~~ **Fixed**  | Medium   |
| [190](./190-autodetect-drops-ftp-hr-thresholds.md)        | ~~Autodetect drops FTP/HR~~ **Fixed**             | High     |
| [191](./191-profile-autodetect-no-rollback.md)            | ~~Autodetect no rollback~~ **Fixed**              | Medium   |
| [192](./192-nutrition-toggle-no-revert-on-fail.md)        | ~~Nutrition toggle no revert~~ **Fixed**          | Medium   |
| [193](./193-measurements-preferred-source-no-rollback.md) | ~~Measurements optimistic no rollback~~ **Fixed** | Medium   |
| [194](./194-availability-tab-loses-unsaved-edits.md)      | ~~Availability tab loses edits~~ **Fixed**        | Medium   |
| [195](./195-public-presence-watcheffect-overwrites.md)    | ~~Public presence overwrites edits~~ **Fixed**    | Medium   |
| [196](./196-sentry-no-cefsharp-scanner-filter.md)         | Sentry CefSharp filter missing                    | Low      |
| [197](./197-connected-apps-hides-failed-status.md)        | ~~Connected apps hides FAILED~~ **Fixed**         | High     |
| [198](./198-measurements-load-error-wrong-toast.md)       | Measurements load wrong toast                     | Low      |

## Issues 199–218 (i18n, a11y, misc)

| ID                                                     | Title                                  | Priority |
| ------------------------------------------------------ | -------------------------------------- | -------- |
| [199](./199-data-page-no-i18n.md)                      | data.vue no i18n                       | Low      |
| [200](./200-connect-pages-no-i18n.md)                  | ~~connect-\* pages no i18n~~ **Fixed** | Low      |
| [201](./201-coaching-pages-no-i18n.md)                 | ~~coaching pages no i18n~~ **Fixed**   | Low      |
| [202](./202-issues-pages-no-i18n.md)                   | issues pages no i18n                   | Low      |
| [203](./203-report-detail-no-i18n.md)                  | ~~report detail no i18n~~ **Fixed**    | Low      |
| [204](./204-help-center-partial-i18n.md)               | ~~help-center partial i18n~~ **Fixed** | Low      |
| [205](./205-support-partial-i18n.md)                   | ~~support partial i18n~~ **Fixed**     | Low      |
| [206](./206-daily-checkin-modal-no-i18n.md)            | daily checkin modal no i18n            | Low      |
| [207](./207-admin-stats-no-i18n.md)                    | ~~admin stats no i18n~~ **Fixed**      | Low      |
| [208](./208-report-detail-back-button-a11y.md)         | report back button a11y                | Low      |
| [209](./209-issue-detail-icon-buttons-a11y.md)         | issue detail icon buttons a11y         | Low      |
| [210](./210-issues-index-search-a11y.md)               | issues search a11y                     | Low      |
| [211](./211-admin-stats-icon-buttons-a11y.md)          | admin stats icon buttons a11y          | Low      |
| [212](./212-help-center-clickable-cards-a11y.md)       | help center cards keyboard a11y        | Medium   |
| [213](./213-data-page-table-a11y.md)                   | data page table a11y                   | Medium   |
| [214](./214-daily-checkin-remove-button-a11y.md)       | checkin remove button a11y             | Low      |
| [215](./215-admin-stats-charts-a11y.md)                | admin stats charts a11y                | Medium   |
| [216](./216-daily-checkin-modal-no-ontaskfailed.md)    | daily checkin no onTaskFailed          | Medium   |
| [217](./217-developer-webhook-url-hardcoded.md)        | developer webhook URL hardcoded        | Low      |
| [218](./218-danger-zone-export-false-success-toast.md) | danger zone export false success       | Low      |

## Issues 219–223 (chat resilience)

| ID                                                          | Title                                             | Priority | Type | Status |
| ----------------------------------------------------------- | ------------------------------------------------- | -------- | ---- | ------ |
| [219](./219-chat-send-error-stuck-state.md)                 | Chat send error leaves turn state stuck           | High     | Bug  | Open   |
| [220](./220-chat-stale-room-load-overwrites-active-room.md) | Stale room load overwrites the active room        | High     | Bug  | Open   |
| [221](./221-chat-websocket-reconnects-after-unmount.md)     | Chat WebSocket reconnects after page unmount      | Medium   | Bug  | Open   |
| [222](./222-chat-stale-turn-recovery-race.md)               | Stale-turn recovery can interrupt completed turns | High     | Bug  | Open   |
| [223](./223-chat-direct-send-no-retry.md)                   | Direct chat sends have no durable retry path      | Medium   | Bug  | Open   |

## Issues 224–237 (chat page review — 2026-07-13)

| ID                                                        | Title                                            | Priority | Type        | Status |
| --------------------------------------------------------- | ------------------------------------------------ | -------- | ----------- | ------ |
| [224](./224-chat-turn-executor-timer-leak.md)             | Turn executor timer leak and stuck rooms         | High     | Bug         | Fixed  |
| [225](./225-chat-ws-auth-in-memory-multi-instance.md)     | WS auth tokens in-memory (multi-instance)        | High     | Bug         | Fixed  |
| [226](./226-chat-share-leaks-internal-messages.md)        | Public chat share leaks internal messages        | High     | Bug         | Fixed  |
| [227](./227-chat-room-existence-oracle.md)                | Room existence oracle in messages.post           | Medium   | Security    | Fixed  |
| [228](./228-chat-auto-send-from-query-params.md)          | Auto-send from URL query params                  | Medium   | Security    | Fixed  |
| [229](./229-chat-edit-regenerate-message-loss.md)         | Edit-and-regenerate can lose user message        | Medium   | Bug         | Fixed  |
| [230](./230-chat-forged-tool-approval-metadata.md)        | Client can persist forged tool approval metadata | Medium   | Security    | Fixed  |
| [231](./231-chat-share-token-minted-on-modal-open.md)     | Share token minted on modal open                 | Medium   | Privacy     | Fixed  |
| [232](./232-chat-reply-to-id-unvalidated.md)              | replyToId not validated against room             | Medium   | Bug         | Fixed  |
| [233](./233-chat-double-send-race.md)                     | Chat double-send race                            | Low      | Bug         | Fixed  |
| [234](./234-chat-queue-survives-identity-switch.md)       | Outgoing queue survives identity switch          | Low      | Bug         | Fixed  |
| [235](./235-chat-polling-amplification.md)                | Polling amplification during active turns        | Low      | Performance | Fixed  |
| [236](./236-chat-realtime-fetch-race-flicker.md)          | Realtime delta vs HTTP refresh race              | Low      | Bug         | Fixed  |
| [237](./237-chat-quota-failure-invisible-at-execution.md) | Execution-time quota failure invisible to user   | Medium   | Bug         | Fixed  |

## Issues 238–258 (nutrition system review — 2026-07-13)

Deep pass over the nutrition system: `server/utils/nutrition-domain/`,
`server/utils/nutrition/`, `metabolicService`, `server/api/nutrition/*`, nutrition
trigger tasks, and key UI components. Complements the earlier page-level nutrition pass
(067, 075, 081–084, 114, 156–157).

| ID                                                                 | Title                                                             | Priority | Type            | Status |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- | -------- | --------------- | ------ |
| [238](./238-rescue-protocol-zero-intra-carbs.md)                   | LOW_FIBER_LIQUID rescue protocol sets intra carbs to 0            | High     | Bug             | Fixed  |
| [239](./239-metabolic-chain-never-persisted.md)                    | Metabolic chain state never persisted in production               | High     | Bug/Arch        | Fixed  |
| [240](./240-check-critical-alerts-stubbed.md)                      | `checkCriticalAlerts` body deleted in refactor                    | Medium   | Bug             | Fixed  |
| [241](./241-adjust-fueling-post-workout-dead-and-wrong.md)         | `adjust-fueling-post-workout` never triggered; kJ formula wrong   | Medium   | Bug             | Open   |
| [242](./242-ai-log-hydration-double-count.md)                      | AI food log double-counts hydration (AI item + regex fallback)    | High     | Bug             | Fixed  |
| [243](./243-extract-fluid-volume-container-double-count.md)        | `extractFluidIntakeMl` double-counts volume + container           | Medium   | Bug             | Fixed  |
| [244](./244-nutrition-source-precedence-unenforced.md)             | Source precedence unenforced; API upload wipes manual logs        | High     | Bug             | Fixed  |
| [245](./245-carb-load-backfill-double-counts-allocated.md)         | Carb-loading back-distribution double-counts allocations          | Medium   | Bug             | Open   |
| [246](./246-repair-chain-unbounded-future-recursion.md)            | `repairMetabolicChain` unbounded future recursion + create race   | Medium   | Bug             | Open   |
| [247](./247-wave-endpoints-unbounded-range.md)                     | Wave endpoints accept unbounded ranges (CPU/DB amplification)     | Medium   | Bug/Performance | Open   |
| [248](./248-simulate-impact-no-validation.md)                      | `simulate-impact` endpoint has no input validation                | Low      | Bug             | Open   |
| [249](./249-metabolic-sim-internal-inconsistencies.md)             | Metabolic sim inconsistencies (drain, absorption cap, precedence) | Medium   | Bug             | Open   |
| [250](./250-finalizeday-diverges-from-timeline.md)                 | `finalizeDay` simulates a different day than `getDailyTimeline`   | Medium   | Bug             | Open   |
| [251](./251-analyze-nutrition-schema-and-status-gaps.md)           | analyze-nutrition schema mismatch; QUOTA_EXCEEDED never retried   | Medium   | Bug             | Open   |
| [252](./252-nutrition-last-call-dead-cron.md)                      | `nutrition-last-call` disabled cron still runs every 30 min       | Low      | Maintenance     | Open   |
| [253](./253-items-patch-nonatomic-move-and-races.md)               | Item mutations: non-atomic cross-meal move + write races          | Medium   | Bug             | Open   |
| [254](./254-meal-rec-modal-single-shot-poll.md)                    | Meal rec modal poll fallback fires once after 3s                  | Medium   | Bug             | Open   |
| [255](./255-recommendation-stuck-processing-on-trigger-failure.md) | Recommendation stuck PROCESSING when trigger enqueue fails        | Medium   | Bug             | Open   |
| [256](./256-active-feed-ignores-absorption-type.md)                | Active feed absorption progress ignores stored `absorptionType`   | Low      | Bug             | Open   |
| [257](./257-strategy-endpoints-recompute-amplification.md)         | Strategy/upcoming endpoints recompute plans dozens of times       | Medium   | Performance     | Open   |
| [258](./258-waverange-utc-day-grouping.md)                         | `getWaveRange` groups workouts by UTC date, not local day         | Medium   | Bug             | Open   |

### Suggested fix order (nutrition)

1. **238 + 242 + 243** — user-facing data correctness (rescue fueling, hydration double counts); small isolated fixes
2. **244** — stop API uploads wiping manual logs (data loss)
3. **239 + 250 + 240** — decide the chain-persistence architecture, unify day simulation, restore alerts
4. **247 + 257** — bound and batch the simulation endpoints (perf/DoS)
5. **253 + 255 + 254** — mutation atomicity and stuck-state recovery
6. **245 + 249 + 258** — simulation fidelity cluster
7. **241 + 246 + 248 + 251 + 252 + 256** — remaining dead-feature/validation cleanups

---

## Issues 259–262 (strength structured workout path review — 2026-07-13)

Deep pass over the strength structured-workout path: library normalization, exercise matching, validation/support matrix, metrics estimators, and publishing serialization.

| ID                                                               | Title                                                                | Priority | Type            | Status |
| ---------------------------------------------------------------- | -------------------------------------------------------------------- | -------- | --------------- | ------ |
| [259](./259-strength-normalization-retains-steps.md)             | Strength normalization keeps `steps` → double metrics/export blocked | High     | Bug             | Open   |
| [260](./260-strength-export-validation-exemption-dead.md)        | Strength export validation exemption is dead code                    | High     | Bug             | Open   |
| [261](./261-strength-library-matching-can-fail-trigger.md)       | Strength library matching can fail the whole trigger task            | High     | Bug/Performance | Open   |
| [262](./262-strength-distance-prescription-modes-unsupported.md) | Strength distance prescription modes inflate duration/TSS            | High     | Bug             | Open   |

## Issues 263–275 (coaching pages review — 2026-07-14)

Systematic pass over `/coaching` pages, components, `coachingRepository`, `teamRepository`, and all coaching API routes. Prior issues 068, 085, 115–116, 152–154, 201 covered feed links, i18n, and join flow.

| ID                                                         | Title                                                  | Priority | Type             | Status |
| ---------------------------------------------------------- | ------------------------------------------------------ | -------- | ---------------- | ------ |
| [263](./263-public-share-invite-single-use.md)             | Public coach/team share invites are single-use         | Critical | Bug              | Open   |
| [264](./264-team-roster-enrichment-wrong-coach-id.md)      | Team roster enrichment passes `teamId` as `coachId`    | High     | Bug              | Open   |
| [265](./265-group-delete-route-missing.md)                 | Delete Group button calls missing API route            | High     | Bug              | Open   |
| [266](./266-team-staff-cannot-access-roster-athletes.md)   | Team staff 403 on athletes they don't personally coach | High     | Bug/AuthZ        | Open   |
| [267](./267-weak-invite-codes-no-rate-limit.md)            | Weak invite codes with no redemption rate limiting     | High     | Security         | Open   |
| [268](./268-coaches-only-masking-leaks-email.md)           | COACHES_ONLY visibility still leaks member emails      | High     | Security/Privacy | Open   |
| [269](./269-coaching-legacy-endpoints-skip-requireauth.md) | Older coaching endpoints skip `requireAuth` guards     | Medium   | Security         | Open   |
| [270](./270-coach-calendar-panel-fetch-race.md)            | Coach calendar panel fetch race on fast navigation     | Medium   | Bug              | Open   |
| [271](./271-overview-compliance-server-timezone.md)        | Overview compliance grid uses server timezone          | Medium   | Bug              | Open   |
| [272](./272-adherence-100-with-zero-planned.md)            | Adherence shows 100% with zero planned workouts        | Medium   | Bug/UX           | Open   |
| [273](./273-team-invite-email-case-sensitive.md)           | Team invite email restriction is case-sensitive        | Medium   | Bug              | Open   |
| [274](./274-coaching-calendar-unbounded-range.md)          | Coaching athlete calendar accepts unbounded date range | Medium   | Bug/Performance  | Open   |
| [275](./275-coaching-polish-bundle.md)                     | Coaching pages low-priority polish (275a–275e)         | Low      | Maintenance      | Open   |

### Suggested fix order (coaching)

1. **263** — public share links multi-use (silent production failure; breaks branded join page)
2. **264 + 272** — roster metrics honest (wrong coach ID + fake 100% adherence)
3. **265** — wire group DELETE (and optional PATCH) route
4. **266** — decide team-staff access model; align UI + `requireCoachAccessToAthlete`
5. **267 + 268** — invite security + email privacy
6. **269 + 273 + 274** — auth consistency and input validation
7. **270 + 271** — calendar/overview correctness
8. **275** — polish when touching nearby files; **116** message-athlete context separately

## Issues 276–281 (mobile UI review — 2026-07-14)

Live responsive audit at 390×844 and 360×800 across `/dashboard`, `/activities`, `/workouts`, `/nutrition`, `/performance`, `/plan`, `/chat`, and `/profile/settings`.

| ID                                                           | Title                                                     | Priority | Type               | Status |
| ------------------------------------------------------------ | --------------------------------------------------------- | -------- | ------------------ | ------ |
| [276](./276-mobile-navbar-actions-overlap-navigation.md)     | Mobile navbar actions overlap and hide primary navigation | High     | UI / UX            | Fixed  |
| [277](./277-mobile-icon-actions-small-and-unnamed.md)        | Mobile icon actions are small and lack accessible names   | Medium   | Accessibility / UI | Fixed  |
| [278](./278-profile-tabs-hide-destinations-on-mobile.md)     | Profile tabs hide most settings destinations on mobile    | Medium   | UI / UX            | Fixed  |
| [279](./279-performance-highlight-filters-clipped-mobile.md) | Performance highlight filters are clipped on mobile       | Medium   | UI / UX            | Fixed  |
| [280](./280-activities-mobile-cards-clip-actions.md)         | Activities mobile cards clip chart and reschedule actions | Medium   | UI / UX            | Fixed  |
| [281](./281-quick-capture-obscures-mobile-content.md)        | Quick Capture obscures mobile page content                | Medium   | UI / UX            | Fixed  |

### Suggested fix order (mobile)

1. **276** — restore reliable access to the sidebar and all header actions
2. **280 + 279** — remove clipped core page controls
3. **281** — establish one shared mobile bottom inset for Quick Capture
4. **277 + 278** — accessible targets and discoverable secondary navigation

## Issues 282–289 (mobile UI continuation — 2026-07-14)

Second live batch covering `/fitness`, `/recovery`, `/recommendations`, `/reports`, `/settings/apps`, `/events`, `/feed`, and representative completed/planned workout detail pages.

| ID                                                      | Title                                                        | Priority | Type          | Status |
| ------------------------------------------------------- | ------------------------------------------------------------ | -------- | ------------- | ------ |
| [282](./282-recovery-head-unmount-breaks-navigation.md) | Leaving Recovery can break the next route in a loading state | High     | Bug           | Fixed  |
| [283](./283-recommendation-cards-show-raw-markdown.md)  | Recommendation cards show raw Markdown syntax                | Medium   | UI / Content  | Fixed  |
| [284](./284-recommendations-heading-clipped-mobile.md)  | Recommendations heading is clipped on mobile                 | Medium   | UI / UX       | Fixed  |
| [285](./285-report-event-tables-hide-mobile-actions.md) | Reports and Events tables hide mobile actions                | High     | UI / UX       | Fixed  |
| [286](./286-connected-apps-untranslated-keys.md)        | Connected Apps exposes untranslated localization keys        | Medium   | UI / i18n     | Fixed  |
| [287](./287-settings-tabs-hide-destinations-mobile.md)  | Settings tabs hide destinations without an affordance        | Medium   | UI / UX       | Fixed  |
| [288](./288-feed-document-title-duplicates-brand.md)    | Several pages duplicate the brand in document titles         | Low      | UI / Metadata | Fixed  |
| [289](./289-sidebar-translation-hydration-mismatch.md)  | Sidebar translations regress to raw keys during hydration    | Medium   | Bug / i18n    | Fixed  |

### Suggested fix order (mobile continuation)

1. **282** — prevent Recovery navigation from breaking destination pages
2. **285** — restore access to report/event status and actions
3. **289 + 286** — resolve visible translation keys and hydration mismatches
4. **283 + 284 + 287** — content rendering and responsive navigation polish
5. **288** — metadata cleanup

## Issues 290–291 (mobile navigation follow-up — 2026-07-14)

Focused live audit of the dashboard header and open sidebar at 390×844, including pointer behavior, navigation scrolling, active-route visibility, and fixed footer space.

| ID                                                           | Title                                                   | Priority | Type    | Status |
| ------------------------------------------------------------ | ------------------------------------------------------- | -------- | ------- | ------ |
| [290](./290-mobile-sidebar-hides-navigation-destinations.md) | Mobile sidebar hides navigation destinations below fold | High     | UI / UX | Fixed  |
| [291](./291-mobile-sidebar-footer-crowds-navigation.md)      | Mobile sidebar footer crowds out core navigation        | Medium   | UI / UX | Fixed  |

### Suggested fix order (mobile navigation)

1. **276** — guarantee the hamburger hit area; move heart/gift and other secondary actions into mobile overflow
2. **290** — group the long menu and reveal the active destination on open
3. **291** — reduce the fixed footer to one compact account row
4. **277 + 289** — improve touch targets and localized accessible sidebar text

## Issues 292–294 (mobile discovery batch — 2026-07-14)

Live 390×844 audit of Library Workouts/Exercises/Plans/Charts, Coaching overview/calendar/athletes/analytics/team, Help Center, sidebar search, Profile Settings, and every nested Settings route.

| ID                                                      | Title                                                  | Priority | Type         | Status |
| ------------------------------------------------------- | ------------------------------------------------------ | -------- | ------------ | ------ |
| [292](./292-exercise-library-filters-hidden-mobile.md)  | Exercise Library hides movement filters on mobile      | Medium   | UI / UX      | Fixed  |
| [293](./293-coaching-calendar-desktop-layout-mobile.md) | Coaching Calendar preserves a desktop layout on mobile | High     | UI / UX      | Fixed  |
| [294](./294-help-center-duplicates-copy-prefixes.md)    | Help Center duplicates Try and Tip prefixes            | Low      | UI / Content | Fixed  |

### Suggested fix order (mobile discovery batch)

1. **293 + 276** — restore app navigation and a usable single-lane Coaching Calendar
2. **292 + 287** — make hidden Library and Settings destinations visibly discoverable
3. **277 + 289** — name undersized Library/Analytics actions and remove raw search keys
4. **288 + 294** — metadata and Help Center copy cleanup

## Issues 295–300 (mobile creation and transactional UI — 2026-07-14)

Live 390×844 audit of first-time consent, manual integration setup, plan generation, Plan Architect, Exercise creation, and representative confirmation/editor overlays.

| ID                                                                | Title                                                   | Priority | Type                  | Status |
| ----------------------------------------------------------------- | ------------------------------------------------------- | -------- | --------------------- | ------ |
| [295](./295-onboarding-consent-controls-unnamed-ambiguous.md)     | Onboarding consent controls are unnamed and ambiguous   | Medium   | Accessibility / UX    | Fixed  |
| [296](./296-integration-credential-fields-unassociated-labels.md) | Integration credential fields have unassociated labels  | Medium   | Accessibility / UX    | Fixed  |
| [297](./297-exercise-editor-dialog-unscrollable-mobile.md)        | Exercise editor dialog is unscrollable on mobile        | High     | UI / UX               | Fixed  |
| [298](./298-plan-wizard-progress-opens-on-wrong-steps-mobile.md)  | Plan wizard progress opens on the wrong steps on mobile | Medium   | UI / UX               | Fixed  |
| [299](./299-plan-goal-cards-not-keyboard-operable.md)             | Plan goal cards are not keyboard operable               | Medium   | Accessibility         | Fixed  |
| [300](./300-plan-architect-new-workout-close-keeps-draft.md)      | Closing a new plan workout keeps an unintended draft    | Medium   | UX / Transactional UI | Fixed  |

### Suggested fix order (mobile creation flows)

1. **297** — make the Exercise editor scrollable and keep its actions reachable
2. **300** — restore true cancel semantics for new Plan Architect workouts
3. **298 + 299** — orient and make the plan wizard operable for every input method
4. **295 + 296** — associate first-time and integration controls with clear labels

## Issues 301–303 (mobile patch validation — 2026-07-14)

Post-implementation browser validation at 390×844 on localhost found regressions in the original #276/#289 fixes.

| ID                                                          | Title                                                          | Priority | Type                 | Status |
| ----------------------------------------------------------- | -------------------------------------------------------------- | -------- | -------------------- | ------ |
| [301](./301-mobile-navbar-hides-page-title.md)              | Mobile navbar hides page title leaving empty header space      | Medium   | UI / UX              | Fixed  |
| [302](./302-mobile-sidebar-slideover-ignores-title-prop.md) | Mobile sidebar slideover ignores UDashboardSidebar title props | Medium   | Accessibility / i18n | Fixed  |
| [303](./303-mobile-sidebar-footer-aria-label-regression.md) | Mobile sidebar footer aria-label shows raw key or crashes SSR  | Medium   | Accessibility / Bug  | Fixed  |

### Validation notes

- **Confirmed fixed:** #278 profile tabs, #286 apps copy, #292 exercise filter sheet, #285 reports mobile cards, #290–291 sidebar grouping/footer, overflow menus (#276 core behavior).
- **Required follow-up fixes:** #301 (`app.config.ts` title slot), #302 (`:menu` title override), #303 (computed aria-label fallback).
- **Remaining watch item:** `LayoutPageNavbarActions` uses the `lg` breakpoint while navbar titles previously hid below `sm` — consider aligning breakpoints if tablet layouts look inconsistent between 640–1024px.

## Issues 304–306 (high-frequency mobile card density — 2026-07-14)

Live 390×844 comparison of Dashboard, Recovery, Profile Settings, Athlete Profile, Performance, Activities, Workouts, Nutrition, Training Plan, and completed/planned workout details. Issues were filed only where stacked containment materially reduced usable width; single-layer cards on Performance, Nutrition, Workouts, and workout details remain useful reference implementations.

| ID                                                                  | Title                                                 | Priority | Type    | Status |
| ------------------------------------------------------------------- | ----------------------------------------------------- | -------- | ------- | ------ |
| [304](./304-dashboard-athlete-profile-nested-cards-mobile.md)       | Dashboard Athlete Profile double-cards mobile content | Medium   | UI / UX | Fixed  |
| [305](./305-profile-pages-stack-mobile-gutters-and-card-padding.md) | Profile pages stack mobile gutters and card padding   | Medium   | UI / UX | Fixed  |
| [306](./306-recovery-page-triple-frames-empty-context-mobile.md)    | Recovery page triple-frames empty context on mobile   | Medium   | UI / UX | Fixed  |

### Validation notes (304–306)

- **304:** Athlete Profile uses one outer card on mobile; modules are divider-separated below `sm`. Metric grids switch to two columns on phones.
- **305:** Shared `profileSettingsCardUi` / `athleteProfileCardUi` in `app/utils/mobile-surface-ui.ts`; single 16 px gutter on all Profile Settings tabs.
- **306:** Recovery Context empty state flattened; mobile filters use a border-separated control row instead of a full card.

## Issues 307–311 (Garmin Health / Activity compliance — 2026-07-16)

Audit of Health/Activity ingest against `tmp/garmin-api` partner docs. Safe patches only — core dailies/sleep/HRV/activities + FIT path unchanged. Webhook auth ([069](./069-garmin-webhook-unauthenticated.md)) remains postponed.

| ID                                                            | Title                                             | Priority | Type        | Status |
| ------------------------------------------------------------- | ------------------------------------------------- | -------- | ----------- | ------ |
| [307](./307-account-deletion-skips-garmin-deregistration.md)  | Account deletion skips Garmin deregistration      | Critical | Bug         | Fixed  |
| [308](./308-garmin-push-summary-keys-mismatch.md)             | Garmin Push summary keys mismatch Health API      | High     | Bug         | Fixed  |
| [309](./309-garmin-health-summary-types-unused.md)            | Garmin Health summary types unused (thin slice)   | Medium   | Enhancement | Fixed  |
| [310](./310-garmin-ingest-stale-export-permissions.md)        | Garmin ingest does not refresh export permissions | Medium   | Bug         | Fixed  |
| [311](./311-garmin-adhoc-pull-vs-push-guidance.md)            | Ad-hoc pull vs Ping/Push partner guidance         | Low      | Maintenance | Open   |
| [174](./174-garmin-ingest-silent-noop-missing-integration.md) | Garmin ingest silent noop (also fixed this batch) | Medium   | Bug         | Fixed  |

### Validation notes (307–311)

- **307:** Deregister before `user.delete`; failures logged, wipe continues.
- **308:** Prefer `bodyComps` / `stressDetails` / `allDayRespiration` / `pulseox`; legacy aliases kept.
- **309:** Pull + backfill for bodyComps/userMetrics only; other Health types remain deferred.
- **310:** Fail-soft permissions refresh on ingest + OAuth callback.
- **311:** Documented only — no polling policy change yet.

## Issues 312–322 (Garmin integration reliability/security follow-up — 2026-07-16)

Second pass across OAuth, Push/Ping routing, FIT callback retrieval, token rotation, ingest/backfill
status, Health field mapping, activity cadence, and Training/Courses publishing. Compared against the
checked-in Garmin partner PDFs and OpenAPI snapshots under `tmp/garmin-api`.

| ID                                                                 | Title                                               | Priority | Type                      | Status |
| ------------------------------------------------------------------ | --------------------------------------------------- | -------- | ------------------------- | ------ |
| [312](./312-garmin-activity-file-callback-token-exfiltration.md)   | Activity file callback can exfiltrate access tokens | Critical | Security Bug              | Open   |
| [313](./313-garmin-webhook-multi-user-batch-misrouting.md)         | Webhook multi-user batches are misrouted            | Critical | Security / Data Integrity | Open   |
| [314](./314-garmin-refresh-token-rotation-races.md)                | Refresh token rotation is race-prone                | High     | Bug                       | Open   |
| [315](./315-garmin-disabled-fetches-hide-requested-failure.md)     | Disabled fetches hide failure of requested data     | High     | Bug                       | Open   |
| [316](./316-garmin-permission-refresh-preserves-revoked-grants.md) | Permission refresh preserves revoked grants         | Medium   | Bug                       | Open   |
| [317](./317-garmin-backfill-reports-success-after-failure.md)      | Backfill reports success after failure              | Medium   | Bug                       | Open   |
| [318](./318-garmin-recovery-fields-do-not-match-health-api.md)     | Recovery fields do not match Health API models      | Medium   | Bug / Data Quality        | Open   |
| [319](./319-garmin-run-swim-cadence-not-imported.md)               | Run and swim cadence are not imported               | Medium   | Bug / Data Quality        | Open   |
| [320](./320-garmin-oauth-callback-not-bound-to-initiation.md)      | OAuth callback is not bound to its initiation       | Medium   | Security Bug              | Open   |
| [321](./321-garmin-external-user-ownership-race.md)                | External Garmin user ownership check is race-prone  | Medium   | Security / Data Integrity | Open   |
| [322](./322-garmin-trail-course-mapped-as-running.md)              | Trail courses are mapped as road running            | Low      | Bug                       | Open   |

### Recommended fix order (312–322)

1. **312 + 313** — prevent credential disclosure and cross-user data routing
2. **314 + 315** — stabilize token lifecycle and sync truthfulness
3. **321 + 320** — enforce Garmin account ownership and OAuth correlation
4. **316 + 317** — correct permissions and backfill status
5. **318 + 319 + 322** — data-quality and sport-mapping corrections

## Issues 324–325 (Public documentation gaps — 2026-07-18)

User-facing `/documentation/` coverage review. Foundation pages first; support-depth second. No competitor comparisons in public docs.

| ID                                                | Title                              | Priority | Type          | Status  |
| ------------------------------------------------- | ---------------------------------- | -------- | ------------- | ------- |
| [324](./324-documentation-foundation-gaps.md)     | Documentation foundation gaps      | High     | Documentation | Fixed   |
| [325](./325-documentation-support-depth.md)       | Documentation support & depth gaps | Medium   | Documentation | Partial |
| [326](./326-documentation-screenshots-catalog.md) | Documentation screenshots catalog  | Medium   | Documentation | Fixed   |

### Recommended order (324–325)

1. **324** — Account & Billing help page, Athlete/Coach user guides, Strength docs
2. **325** — Structured workout lifecycle, metrics/chart FAQs, coach plan lifecycle, login recovery

## Recommended fix order (app review)

1. ~~**062** — Critical chat crash (069/058 postponed)~~ **Fixed**
2. ~~**187, 190, 197** — Profile settings crash + autodetect + failed integrations (Sentry-linked)~~ **Fixed**
3. ~~**064–065, 141, 186** — Route param / tab navigation refetch pattern~~ **Fixed**
4. ~~**145–147, 041, 136, 146** — Logout/account-switch data hygiene~~ **Fixed**
5. ~~**039, 049–051, 064–065, 073–074, 080–082, 119, 138, 216**~~ — `onTaskFailed` sweep **Fixed** (PR #230)
6. ~~**171–172, 175–177**~~ — Trigger ingest/quota/stuck PROCESSING **Fixed** (PR 6)
7. ~~**066, 155–160, 157**~~ — Share/privacy hardening **Fixed** (PR 7; 158 postponed — OAuth developer)
8. ~~Webhook/OAuth auth (057–129 subset)~~ — **Postponed** until third-party coordination
9. ~~**152–154** — Join/onboarding flow~~ **Fixed** (PR 8)
10. **199–215** — i18n/a11y (incremental, low risk)
11. Remaining active medium/low

## How issues are managed

- Flat files: `docs/issues/NNN-slug.md`
- Progress: [REVIEW-PROGRESS.md](./REVIEW-PROGRESS.md)
- GitHub: [issue-management.md](../04-guides/issue-management.md)
- Sentry: [SENTRY-ISSUES.md](../../SENTRY-ISSUES.md)

## Related trackers

- [issues.md](./issues.md) — Structure generation (001–038)
- [REVIEW-PROGRESS.md](./REVIEW-PROGRESS.md) — Systematic review progress
