# App Review — Issue Tracker

Last reviewed: 2026-07-08 (systematic review session 3)

Documents **180 app-wide issues** (039–218) from systematic codebase review. Complements structure-generation tracker [issues.md](./issues.md) (001–038).

**Progress:** [REVIEW-PROGRESS.md](./REVIEW-PROGRESS.md) (~90% complete)

**Postponed:** 22 issues deferred (auth, webhooks, OAuth, Yazio credential storage) — ingest/integration flows unchanged until coordinated.

## Summary by priority

| Priority | Count (039–218) | Active (excl. postponed) |
| -------- | --------------- | ------------------------ |
| Critical | 3               | 1                        |
| High     | 52              | 42                       |
| Medium   | 108             | 100                      |
| Low      | 37              | 36                       |

## Top clusters (fix these first)

### P0 — Critical runtime & security (active)

| ID                                                       | Title                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| [062](./062-chat-planned-workout-pollstartedat-crash.md) | ~~Chat planned-workout card `pollStartedAt` crash~~ **Fixed** |
| ~~[069](./069-garmin-webhook-unauthenticated.md)~~       | Garmin webhook — **Postponed**                                |
| ~~[058](./058-oauth-refresh-weak-client-binding.md)~~    | OAuth refresh — **Postponed**                                 |

### P1 — High-impact user flows

| ID                                                                                                             | Title                                        |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [064](./064-workout-detail-stale-on-nav.md) / [065](./065-planned-workout-stale-on-nav.md)                     | Workout pages stale on neighbor navigation   |
| [067](./067-nutrition-estimate-missing-id.md)                                                                  | Nutrition estimate days break mutations      |
| [068](./068-coaching-overview-wrong-workout-links.md)                                                          | Coaching feed links wrong workout route      |
| [076](./076-analytics-dashboard-autosave-silent-fail.md)                                                       | Analytics dashboard save fails silently      |
| [131](./131-feed-load-more-never-refetches.md)                                                                 | Feed pagination broken                       |
| [134](./134-activities-sync-spinner-stuck.md)                                                                  | Activities sync spinner stuck                |
| [145](./145-logout-no-pinia-store-reset.md)                                                                    | Logout doesn't reset stores                  |
| [147](./147-user-store-cache-blocks-refetch.md)                                                                | User store cache blocks refetch after switch |
| [152](./152-onboarding-blocks-join-callback.md)                                                                | Onboarding blocks post-signup join           |
| [171](./171-ingest-hevy-no-date-window.md) / [172](./172-garmin-ingest-clamps-24h-window.md)                   | Ingest date window bugs                      |
| [175](./175-wellness-analysis-no-quota-check.md) / [177](./177-recommend-today-processing-stuck-on-failure.md) | AI quota / stuck PROCESSING                  |
| [187](./187-profile-tab-unmount-popper-crash.md)                                                               | Profile settings popper crash (Sentry 18A)   |
| [190](./190-autodetect-drops-ftp-hr-thresholds.md)                                                             | Autodetect drops FTP/HR thresholds           |
| [197](./197-connected-apps-hides-failed-status.md)                                                             | Connected apps hides FAILED integrations     |

### P2 — Recurring pattern: stuck loading spinners

039, 049–051, 064–065, 073–074, 080–082, 119, 138 — all need `onTaskFailed` handlers.

### P3 — Webhook & integration security (postponed)

059, 069, 072, 098, 099, 100, 101, 105, 058, 071, 093, 094, 110, 111, 125, 126, 129, 063, 102 — **deferred** until third-party/provider coordination. Ingest-safe fixes (060, 108, 106, 197, etc.) remain active. **057 fixed** (admin guard on debug routes).

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

066, 095–096, 135–137, 155–160, 157

---

| ID                                                      | Title                                   | Priority | Type        |
| ------------------------------------------------------- | --------------------------------------- | -------- | ----------- |
| [039](./039-dashboard-sync-stuck-loading.md)            | Dashboard sync stuck loading            | High     | Bug         |
| [040](./040-billing-success-without-activation.md)      | Billing success without activation      | High     | Bug         |
| [041](./041-workout-comparison-cross-user-leak.md)      | Comparison basket cross-user leak       | High     | Bug         |
| [042](./042-non-intervals-today-workouts-skipped.md)    | Non-Intervals today workouts skipped    | Medium   | Bug         |
| [043](./043-fit-upload-spurious-toasts.md)              | FIT upload spurious toasts              | Medium   | Bug         |
| [044](./044-wellness-modal-error-as-empty.md)           | Wellness modal error as empty           | Medium   | UI          |
| [045](./045-wellness-modal-dialog-title-a11y.md)        | Wellness modal a11y title               | Low      | UI          |
| [046](./046-profile-settings-stale-on-fail.md)          | Profile stale on failed save            | Medium   | Bug         |
| [047](./047-support-email-html-injection.md)            | Support email HTML injection            | Medium   | Bug         |
| [048](./048-recovery-history-no-error-ui.md)            | Recovery history no error UI            | Medium   | UI          |
| [049](./049-performance-insights-stuck-loading.md)      | Performance insights stuck              | Medium   | Bug         |
| [050](./050-reports-generating-stuck-on-failure.md)     | Reports generating stuck                | Medium   | Bug         |
| [051](./051-recommendations-update-stuck-loading.md)    | Recommendations update stuck            | Medium   | Bug         |
| [052](./052-notification-errors-swallowed.md)           | Notification errors swallowed           | Medium   | UI          |
| [053](./053-notification-mark-read-race.md)             | Notification mark-read race             | Low      | Bug         |
| [054](./054-use-polling-aborts-on-error.md)             | usePolling aborts on error              | Medium   | Bug         |
| [055](./055-communication-prefs-misleading-defaults.md) | Communication prefs defaults            | Medium   | UI          |
| [056](./056-orchestrate-progress-key-mismatch.md)       | Orchestrate SSE key mismatch            | High     | Bug         |
| [057](./057-unauthenticated-debug-endpoints.md)         | Unauthenticated debug endpoints (fixed) | High     | Bug         |
| [058](./058-oauth-refresh-weak-client-binding.md)       | OAuth refresh weak binding              | Critical | Bug         |
| [059](./059-withings-webhook-unauthenticated.md)        | Withings webhook unauthenticated        | High     | Bug         |
| [060](./060-integration-syncstatus-stuck.md)            | syncStatus stuck SYNCING                | Medium   | Bug         |
| [061](./061-i18n-gaps-secondary-pages.md)               | i18n gaps secondary pages               | Low      | Maintenance |

---

## Issues 062–090 (workouts, chat, nutrition, coaching)

| ID                                                       | Title                                  | Priority |
| -------------------------------------------------------- | -------------------------------------- | -------- |
| [062](./062-chat-planned-workout-pollstartedat-crash.md) | ~~Chat pollStartedAt crash~~ **Fixed** | Critical |
| [063](./063-admin-queue-api-unauthenticated.md)          | Admin queue API unauthenticated        | High     |
| [064](./064-workout-detail-stale-on-nav.md)              | Workout detail stale on nav            | High     |
| [065](./065-planned-workout-stale-on-nav.md)             | Planned workout stale on nav           | High     |
| [066](./066-public-workout-share-raw-id-fallback.md)     | Share raw workout ID fallback          | High     |
| [067](./067-nutrition-estimate-missing-id.md)            | Nutrition estimate missing id          | High     |
| [068](./068-coaching-overview-wrong-workout-links.md)    | Coaching feed wrong links              | High     |
| [069](./069-garmin-webhook-unauthenticated.md)           | Garmin webhook unauthenticated         | Critical |
| [070](./070-yazio-password-plaintext-storage.md)         | Yazio password plaintext               | High     |
| [071](./071-oauth-auth-code-ignores-redirect-uri.md)     | OAuth ignores redirect_uri             | High     |
| [072](./072-whoop-async-webhook-auth-bypass.md)          | Whoop async webhook bypass             | High     |
| [073](./073-workouts-index-analyze-stuck-loading.md)     | Workouts index analyze stuck           | High     |
| [074](./074-workout-detail-analysis-stuck-loading.md)    | Workout detail analysis stuck          | High     |
| [075](./075-nutrition-hydration-advice-inverted.md)      | Hydration advice inverted              | Medium   |
| [076](./076-analytics-dashboard-autosave-silent-fail.md) | Analytics autosave silent fail         | High     |
| [077](./077-chat-load-errors-empty-state.md)             | Chat load errors empty                 | Medium   |
| [078](./078-library-chat-deeplink-istemplate-ignored.md) | Library chat isTemplate ignored        | Medium   |
| [079](./079-chat-tool-approval-stuck-on-failure.md)      | Tool approval stuck                    | Medium   |
| [080](./080-plan-dashboard-tasks-no-ontaskfailed.md)     | Plan dashboard no onTaskFailed         | Medium   |
| [081](./081-nutrition-history-analyze-stuck-loading.md)  | Nutrition history analyze stuck        | Medium   |
| [082](./082-meal-recommendation-modal-stuck-loading.md)  | Meal modal stuck loading               | Medium   |
| [083](./083-nutrition-detail-analyze-no-ui-refresh.md)   | Nutrition analyze no UI refresh        | Medium   |
| [084](./084-nutrition-detail-back-wrong-route.md)        | Nutrition back wrong route             | Medium   |
| [085](./085-coaching-team-delete-stub.md)                | Team delete stub                       | Medium   |
| [086](./086-library-plan-delete-stub.md)                 | Library plan delete stub               | Medium   |
| [087](./087-library-workout-use-session-stub.md)         | Library use session stub               | Medium   |
| [088](./088-workout-matcher-silent-link-errors.md)       | WorkoutMatcher silent errors           | Medium   |
| [089](./089-planned-workout-error-as-not-found.md)       | Planned error as not found             | Medium   |
| [090](./090-workouts-mobile-analyze-labeled-sync.md)     | Mobile analyze labeled Sync            | Medium   |

## Issues 091–120 (workouts, oauth, webhooks, plans, library)

| ID                                                        | Title                             | Priority |
| --------------------------------------------------------- | --------------------------------- | -------- |
| [091](./091-workouts-overall-quality-wrong-metric-key.md) | Overall quality wrong metric      | Medium   |
| [092](./092-workout-analysis-toast-no-run-correlation.md) | Analysis toast no correlation     | Medium   |
| [093](./093-oauth-userinfo-email-ignores-scopes.md)       | userinfo email ignores scopes     | Medium   |
| [094](./094-share-generate-workout-read-all-types.md)     | Share generate scope escalation   | Medium   |
| [095](./095-plan-share-auto-creates-permanent-tokens.md)  | Plan share auto-creates tokens    | Medium   |
| [096](./096-join-invite-preview-exposes-pii.md)           | Join preview exposes PII          | Medium   |
| [097](./097-onboarding-consent-api-bypass.md)             | Onboarding consent bypass         | Medium   |
| [098](./098-polar-webhook-missing-userid.md)              | Polar webhook missing userId      | High     |
| [099](./099-oauth-generic-webhook-ignores-secret.md)      | OAuth webhook ignores secret      | High     |
| [100](./100-strava-webhook-post-unauthenticated.md)       | Strava POST unauthenticated       | High     |
| [101](./101-wahoo-webhook-auth-optional.md)               | Wahoo auth optional               | High     |
| [102](./102-monitoring-trigger-public-without-secret.md)  | Monitoring public without secret  | High     |
| [103](./103-health-endpoint-leaks-db-errors.md)           | Health leaks DB errors            | Medium   |
| [104](./104-stripe-webhook-echoes-errors.md)              | Stripe webhook echoes errors      | Medium   |
| [105](./105-withings-webhook-no-idempotency.md)           | Withings no idempotency           | Medium   |
| [106](./106-sync-queue-duplicate-processing.md)           | Sync queue duplicates             | Medium   |
| [107](./107-webhook-poller-double-enqueue.md)             | Webhook poller double enqueue     | Medium   |
| [108](./108-integration-sync-no-inflight-guard.md)        | Sync no in-flight guard           | Medium   |
| [109](./109-deactivated-users-pass-client-middleware.md)  | Deactivated users pass middleware | Medium   |
| [110](./110-oauth-login-open-redirect.md)                 | OAuth login open redirect         | Medium   |
| [111](./111-oauth-consent-csrf.md)                        | OAuth consent CSRF                | Medium   |
| [112](./112-map-gpx-download-silent-failure.md)           | Map GPX silent failure            | Medium   |
| [113](./113-workout-export-apis-require-email.md)         | Export APIs require email         | Medium   |
| [114](./114-nutrition-history-trends-silent-fail.md)      | Nutrition trends silent fail      | Medium   |
| [115](./115-coaching-calendar-fetch-unhandled.md)         | Coaching calendar unhandled       | Medium   |
| [116](./116-coaching-message-athlete-no-context.md)       | Message athlete no context        | Medium   |
| [117](./117-plan-wizard-after-failed-abandon.md)          | Plan wizard after failed abandon  | Medium   |
| [118](./118-plan-creation-polling-no-failure-feedback.md) | Plan polling no failure feedback  | Medium   |
| [119](./119-library-workout-structure-no-ontaskfailed.md) | Library structure no onTaskFailed | Medium   |
| [120](./120-library-workout-fetch-error-as-not-found.md)  | Library fetch as not found        | Medium   |

## Issues 121–150 (library, feed, fitness, stores)

| ID                                                           | Title                             | Priority |
| ------------------------------------------------------------ | --------------------------------- | -------- |
| [121](./121-library-plan-folder-errors-swallowed.md)         | Library folder errors swallowed   | Medium   |
| [122](./122-workout-comparison-fetch-failure-hidden.md)      | Comparison fetch failure hidden   | Medium   |
| [123](./123-chat-deeplink-bypasses-turn-queue.md)            | Chat deeplink bypasses queue      | Medium   |
| [124](./124-onboarding-consent-save-silent-fail.md)          | Onboarding consent silent fail    | Medium   |
| [125](./125-oauth-dangerous-email-account-linking.md)        | Dangerous email linking           | High     |
| [126](./126-oauth-authorize-no-scope-validation.md)          | OAuth no scope validation         | Medium   |
| [127](./127-polar-ingest-skips-syncstatus.md)                | Polar skips syncStatus            | Medium   |
| [128](./128-trigger-is-task-running-fails-open.md)           | isTaskRunning fails open          | Medium   |
| [129](./129-oauth-revoke-no-client-auth.md)                  | OAuth revoke no client auth       | Medium   |
| [130](./130-planned-charts-error-as-not-found.md)            | Planned charts not found          | Medium   |
| [131](./131-feed-load-more-never-refetches.md)               | Feed load more broken             | High     |
| [132](./132-feed-sport-filter-wrong-type.md)                 | Feed sport filter wrong type      | Medium   |
| [133](./133-feed-errors-empty-state.md)                      | Feed errors empty state           | Medium   |
| [134](./134-activities-sync-spinner-stuck.md)                | Activities sync spinner stuck     | High     |
| [135](./135-activities-modal-fetch-silent-fail.md)           | Activities modal silent fail      | Medium   |
| [136](./136-activities-columns-cross-user.md)                | Activities columns cross-user     | Medium   |
| [137](./137-activities-workout-matcher-unreachable.md)       | WorkoutMatcher unreachable        | Medium   |
| [138](./138-fitness-detail-analyze-stuck.md)                 | Fitness analyze stuck             | High     |
| [139](./139-fitness-index-90-day-api-cap.md)                 | Fitness 90-day API cap            | High     |
| [140](./140-fitness-filter-empty-page.md)                    | Fitness filter empty page         | Low      |
| [141](./141-events-detail-stale-on-nav.md)                   | Events stale on nav               | Medium   |
| [142](./142-event-priority-none-invalid.md)                  | Event priority NONE invalid       | Medium   |
| [143](./143-admin-subscriptions-missing-admin-middleware.md) | Admin subscriptions no middleware | Medium   |
| [144](./144-admin-issue-reactions-no-admin-check.md)         | Admin reactions no admin check    | High     |
| [145](./145-logout-no-pinia-store-reset.md)                  | Logout no store reset             | High     |
| [146](./146-logout-library-folders-not-cleared.md)           | Logout folders not cleared        | Medium   |
| [147](./147-user-store-cache-blocks-refetch.md)              | User store cache blocks refetch   | High     |
| [148](./148-recommendations-adhoc-spinner-stuck.md)          | Ad-hoc workout spinner stuck      | Medium   |
| [149](./149-folder-refresh-silent-stale.md)                  | Folder refresh silent stale       | Medium   |
| [150](./150-recommendations-stale-on-404.md)                 | Recommendations stale on 404      | Medium   |

## Issues 151–170 (join, share, developer, triggers)

| ID                                                     | Title                          | Priority |
| ------------------------------------------------------ | ------------------------------ | -------- |
| [151](./151-user-profile-stale-on-error.md)            | User profile stale on error    | Medium   |
| [152](./152-onboarding-blocks-join-callback.md)        | Onboarding blocks join         | High     |
| [153](./153-join-auto-accept-branded-only.md)          | Join auto-accept branded only  | Medium   |
| [154](./154-join-accept-errors-return-500.md)          | Join accept returns 500        | Medium   |
| [155](./155-workout-share-leaks-zone-profiles.md)      | Share leaks zone profiles      | High     |
| [156](./156-nutrition-share-url-404.md)                | Nutrition share URL 404        | Medium   |
| [157](./157-nutrition-share-unsanitized-payload.md)    | Nutrition share unsanitized    | High     |
| [158](./158-developer-get-leaks-webhook-secret.md)     | Developer GET leaks secret     | High     |
| [159](./159-planned-workout-share-ignores-preview.md)  | Planned share ignores preview  | Medium   |
| [160](./160-wellness-share-og-leaks-biometrics.md)     | Wellness OG leaks biometrics   | Medium   |
| [161](./161-connect-yazio-no-auth-middleware.md)       | Connect Yazio no auth          | High     |
| [162](./162-fit-ingest-no-file-ownership-check.md)     | FIT ingest no ownership check  | High     |
| [163](./163-chat-tts-transcribe-no-quota.md)           | Chat TTS/transcribe no quota   | Medium   |
| [164](./164-chat-turn-retry-no-quota.md)               | Chat retry no quota            | Medium   |
| [165](./165-chat-queued-messages-lost-on-error.md)     | Queued messages lost on error  | Medium   |
| [166](./166-chat-message-queue-in-memory-only.md)      | Chat queue in-memory only      | Medium   |
| [167](./167-admin-impersonate-self-allowed.md)         | Admin impersonate self         | Medium   |
| [168](./168-admin-user-detail-no-error-state.md)       | Admin user detail no error     | Medium   |
| [169](./169-admin-webhook-stats-wrong-progress-max.md) | Admin webhook stats wrong max  | Low      |
| [170](./170-deduplicate-auto-analyzes-all-recent.md)   | Dedup auto-analyzes all recent | Medium   |

## Issues 171–185 (trigger tasks deep pass)

| ID                                                            | Title                                    | Priority |
| ------------------------------------------------------------- | ---------------------------------------- | -------- |
| [171](./171-ingest-hevy-no-date-window.md)                    | Hevy ingest no date window               | High     |
| [172](./172-garmin-ingest-clamps-24h-window.md)               | Garmin ingest clamps to 24h              | High     |
| [173](./173-wahoo-ingest-capped-100-workouts.md)              | Wahoo capped at 100 workouts             | Medium   |
| [174](./174-garmin-ingest-silent-noop-missing-integration.md) | Garmin silent noop                       | Medium   |
| [175](./175-wellness-analysis-no-quota-check.md)              | Wellness analysis no quota               | High     |
| [176](./176-recommend-today-inline-wellness-no-quota.md)      | Recommend-today inline wellness no quota | High     |
| [177](./177-recommend-today-processing-stuck-on-failure.md)   | Recommend-today PROCESSING stuck         | High     |
| [178](./178-ingest-all-auto-readiness-no-idempotency.md)      | Ingest-all auto-readiness no idempotency | Medium   |
| [179](./179-generate-recommendations-no-quota.md)             | Generate-recommendations no quota        | Medium   |
| [180](./180-generate-recommendations-double-ai-call.md)       | Generate-recommendations double AI call  | Medium   |
| [181](./181-analyze-plan-adherence-no-quota-timeout.md)       | Plan adherence no quota/timeout          | Medium   |
| [182](./182-analyze-wellness-no-ownership-check.md)           | Analyze-wellness no ownership check      | Medium   |
| [183](./183-send-email-dispatch-failure-no-retry.md)          | Send-email dispatch no retry             | Medium   |
| [184](./184-send-email-no-max-duration.md)                    | Send-email no maxDuration                | Low      |
| [185](./185-ingest-all-sync-queue-fire-and-forget.md)         | Ingest-all sync queue fire-and-forget    | Medium   |

## Issues 186–198 (profile/settings + Sentry)

| ID                                                        | Title                               | Priority |
| --------------------------------------------------------- | ----------------------------------- | -------- |
| [186](./186-profile-tab-url-not-synced.md)                | Profile tab URL not synced          | Medium   |
| [187](./187-profile-tab-unmount-popper-crash.md)          | Profile tab popper crash (18A)      | High     |
| [188](./188-sport-settings-warning-no-revert.md)          | Sport settings warning no revert    | Medium   |
| [189](./189-profile-watcheffect-clobbers-edits.md)        | Profile watchEffect clobbers edits  | Medium   |
| [190](./190-autodetect-drops-ftp-hr-thresholds.md)        | Autodetect drops FTP/HR             | High     |
| [191](./191-profile-autodetect-no-rollback.md)            | Autodetect no rollback              | Medium   |
| [192](./192-nutrition-toggle-no-revert-on-fail.md)        | Nutrition toggle no revert          | Medium   |
| [193](./193-measurements-preferred-source-no-rollback.md) | Measurements optimistic no rollback | Medium   |
| [194](./194-availability-tab-loses-unsaved-edits.md)      | Availability tab loses edits        | Medium   |
| [195](./195-public-presence-watcheffect-overwrites.md)    | Public presence overwrites edits    | Medium   |
| [196](./196-sentry-no-cefsharp-scanner-filter.md)         | Sentry CefSharp filter missing      | Low      |
| [197](./197-connected-apps-hides-failed-status.md)        | Connected apps hides FAILED         | High     |
| [198](./198-measurements-load-error-wrong-toast.md)       | Measurements load wrong toast       | Low      |

## Issues 199–218 (i18n, a11y, misc)

| ID                                                     | Title                            | Priority |
| ------------------------------------------------------ | -------------------------------- | -------- |
| [199](./199-data-page-no-i18n.md)                      | data.vue no i18n                 | Low      |
| [200](./200-connect-pages-no-i18n.md)                  | connect-\* pages no i18n         | Low      |
| [201](./201-coaching-pages-no-i18n.md)                 | coaching pages no i18n           | Low      |
| [202](./202-issues-pages-no-i18n.md)                   | issues pages no i18n             | Low      |
| [203](./203-report-detail-no-i18n.md)                  | report detail no i18n            | Low      |
| [204](./204-help-center-partial-i18n.md)               | help-center partial i18n         | Low      |
| [205](./205-support-partial-i18n.md)                   | support partial i18n             | Low      |
| [206](./206-daily-checkin-modal-no-i18n.md)            | daily checkin modal no i18n      | Low      |
| [207](./207-admin-stats-no-i18n.md)                    | admin stats no i18n              | Low      |
| [208](./208-report-detail-back-button-a11y.md)         | report back button a11y          | Low      |
| [209](./209-issue-detail-icon-buttons-a11y.md)         | issue detail icon buttons a11y   | Low      |
| [210](./210-issues-index-search-a11y.md)               | issues search a11y               | Low      |
| [211](./211-admin-stats-icon-buttons-a11y.md)          | admin stats icon buttons a11y    | Low      |
| [212](./212-help-center-clickable-cards-a11y.md)       | help center cards keyboard a11y  | Medium   |
| [213](./213-data-page-table-a11y.md)                   | data page table a11y             | Medium   |
| [214](./214-daily-checkin-remove-button-a11y.md)       | checkin remove button a11y       | Low      |
| [215](./215-admin-stats-charts-a11y.md)                | admin stats charts a11y          | Medium   |
| [216](./216-daily-checkin-modal-no-ontaskfailed.md)    | daily checkin no onTaskFailed    | Medium   |
| [217](./217-developer-webhook-url-hardcoded.md)        | developer webhook URL hardcoded  | Low      |
| [218](./218-danger-zone-export-false-success-toast.md) | danger zone export false success | Low      |

---

## Recommended fix order (app review)

1. ~~**062** — Critical chat crash (069/058 postponed)~~ **Fixed**
2. **187, 190, 197** — Profile settings crash + autodetect + failed integrations (Sentry-linked)
3. **064–065, 141, 186** — Route param / tab navigation refetch pattern
4. **145–147, 041, 136, 146** — Logout/account-switch data hygiene
5. **039, 049–051, 064–065, 073–074, 080–082, 119, 138, 216** — `onTaskFailed` sweep
6. **171–172, 175–177** — Trigger ingest/quota/stuck PROCESSING (ingest-safe)
7. **066, 155–160, 157** — Share/privacy hardening (158 postponed — OAuth developer)
8. ~~Webhook/OAuth auth (057–129 subset)~~ — **Postponed** until third-party coordination
9. **152–154** — Join/onboarding flow
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
