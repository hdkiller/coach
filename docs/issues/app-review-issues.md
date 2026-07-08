# App Review — Issue Tracker

Last reviewed: 2026-07-08

This tracker documents bugs, UX gaps, and security concerns found during a **broad app review** (dashboard, billing, notifications, wellness, integrations, OAuth, and background-task UI lifecycle). It complements the structure-generation tracker in [issues.md](./issues.md) (issues 001–038).

No code changes were made in this review — documentation only.

## Scope

**In scope**

- Dashboard sync and training recommendation cards
- Billing/checkout UX
- Notifications, recovery, reports, performance insights
- Wellness modal and profile settings
- Workout comparison and FIT upload flows
- Background task UI state (`onTaskCompleted` without `onTaskFailed`)
- OAuth token endpoint security
- Integration webhooks and sync status
- Debug endpoint exposure
- i18n coverage gaps

**Out of scope**

- Workout structure generation pipeline (see [issues.md](./issues.md) 001–038)
- Large refactors or architecture rewrites

## Issue Clusters

### Background task UI lifecycle (most common pattern)

Several pages set a loading flag when a Trigger.dev job is enqueued and only clear it on `onTaskCompleted`. Failed tasks leave buttons stuck until reload.

- [039](./039-dashboard-sync-stuck-loading.md) — Dashboard sync (`ingest-all`)
- [049](./049-performance-insights-stuck-loading.md) — Performance Generate Insights
- [050](./050-reports-generating-stuck-on-failure.md) — Reports New Report
- [051](./051-recommendations-update-stuck-loading.md) — Recommendations Update

Related (structure generation): [004](./004-no-task-failure-handling.md), [010](./010-batch-generation-loading-state.md)

### Silent error states (looks empty, actually failed)

- [044](./044-wellness-modal-error-as-empty.md) — Wellness modal
- [048](./048-recovery-history-no-error-ui.md) — Recovery History
- [052](./052-notification-errors-swallowed.md) — Notifications
- [055](./055-communication-prefs-misleading-defaults.md) — Email preferences

### Data integrity / cross-user

- [041](./041-workout-comparison-cross-user-leak.md) — Comparison basket in localStorage
- [042](./042-non-intervals-today-workouts-skipped.md) — Dashboard skips non-Intervals users

### Billing & checkout

- [040](./040-billing-success-without-activation.md) — Success UI without confirmed activation

### Security & integrations

- [057](./057-unauthenticated-debug-endpoints.md) — Public debug routes
- [058](./058-oauth-refresh-weak-client-binding.md) — OAuth refresh token binding
- [059](./059-withings-webhook-unauthenticated.md) — Withings webhook verification
- [047](./047-support-email-html-injection.md) — Support email HTML injection
- [056](./056-orchestrate-progress-key-mismatch.md) — Orchestrate SSE key bug
- [060](./060-integration-syncstatus-stuck.md) — Stuck SYNCING status

### UI polish & accessibility

- [045](./045-wellness-modal-dialog-title-a11y.md) — Wellness modal a11y title
- [046](./046-profile-settings-stale-on-fail.md) — Profile form stale on failed save
- [053](./053-notification-mark-read-race.md) — Notification read race
- [043](./043-fit-upload-spurious-toasts.md) — FIT upload spurious toasts
- [054](./054-use-polling-aborts-on-error.md) — Polling stops on first error
- [061](./061-i18n-gaps-secondary-pages.md) — i18n gaps

## Issues

| ID | Title | Priority | Type | Status |
| --- | --- | --- | --- | --- |
| [039](./039-dashboard-sync-stuck-loading.md) | Dashboard sync button stuck in “Syncing…” | High | Bug | Open |
| [040](./040-billing-success-without-activation.md) | Billing success UI without subscription activation | High | Bug | Open |
| [041](./041-workout-comparison-cross-user-leak.md) | Workout comparison basket persists across logins | High | Bug | Open |
| [042](./042-non-intervals-today-workouts-skipped.md) | Today’s workouts skipped for non-Intervals users | Medium | Bug | Open |
| [043](./043-fit-upload-spurious-toasts.md) | FIT upload toasts on unrelated ingest jobs | Medium | Bug | Open |
| [044](./044-wellness-modal-error-as-empty.md) | Wellness modal mislabels API failures as “no data” | Medium | UI | Open |
| [045](./045-wellness-modal-dialog-title-a11y.md) | Wellness modal incorrect dialog title (a11y) | Low | UI | Open |
| [046](./046-profile-settings-stale-on-fail.md) | Profile settings stale after failed save | Medium | Bug | Open |
| [047](./047-support-email-html-injection.md) | Support API HTML injection in email | Medium | Bug | Open |
| [048](./048-recovery-history-no-error-ui.md) | Recovery History ignores fetch errors | Medium | UI | Open |
| [049](./049-performance-insights-stuck-loading.md) | Performance insights stuck loading on failure | Medium | Bug | Open |
| [050](./050-reports-generating-stuck-on-failure.md) | Reports generating stuck on task failure | Medium | Bug | Open |
| [051](./051-recommendations-update-stuck-loading.md) | Recommendations Update stuck on failure | Medium | Bug | Open |
| [052](./052-notification-errors-swallowed.md) | Notification errors swallowed | Medium | UI | Open |
| [053](./053-notification-mark-read-race.md) | Notification navigate-before-read race | Low | Bug | Open |
| [054](./054-use-polling-aborts-on-error.md) | `usePolling` aborts on first error | Medium | Bug | Open |
| [055](./055-communication-prefs-misleading-defaults.md) | Communication prefs misleading defaults | Medium | UI | Open |
| [056](./056-orchestrate-progress-key-mismatch.md) | Orchestrate progress SSE wrong user key | High | Bug | Open |
| [057](./057-unauthenticated-debug-endpoints.md) | Unauthenticated debug endpoints | High | Bug | Open |
| [058](./058-oauth-refresh-weak-client-binding.md) | OAuth refresh token weak client binding | Critical | Bug | Open |
| [059](./059-withings-webhook-unauthenticated.md) | Withings webhook no authenticity check | High | Bug | Open |
| [060](./060-integration-syncstatus-stuck.md) | Integration syncStatus stuck SYNCING | Medium | Bug | Open |
| [061](./061-i18n-gaps-secondary-pages.md) | i18n gaps on secondary pages | Low | Maintenance | Open |

## Recommended Fix Order

1. **058** — OAuth refresh token security (critical auth gap).
2. **057 + 059** — Lock down debug endpoints and Withings webhook verification.
3. **039 + 049 + 050 + 051** — Add `onTaskFailed` handlers for common background-task UI (shared pattern).
4. **040 + 041** — Billing success correctness and cross-user localStorage leak.
5. **056 + 060** — Orchestrate progress and stuck sync status.
6. **044 + 048 + 052 + 055** — Silent error states (wellness, recovery, notifications, prefs).
7. Remaining medium/low UI items.

## How Issues Are Managed

- **Flat files**: Each issue is a numbered markdown file in `docs/issues/` (same format as 001–038).
- **GitHub Issues**: Use [issue-management.md](../04-guides/issue-management.md) templates and labels when promoting to GitHub.
- **Sentry**: Production runtime errors tracked separately in [SENTRY-ISSUES.md](../../SENTRY-ISSUES.md).
- **Bug report skill**: `.claude/skills/report-bug/` can auto-create GitHub issues from confirmed bugs.

## Key Files Reviewed

| Area | Path |
| ---- | ---- |
| Dashboard sync | `app/pages/dashboard.vue`, `app/stores/integrations.ts` |
| Billing | `app/pages/settings/billing.vue` |
| Recommendations | `app/stores/recommendations.ts`, `app/pages/recommendations/index.vue` |
| Background task UI | `app/composables/useUserRuns.ts`, `app/stores/reports.ts` |
| Wellness | `app/components/WellnessModal.vue` |
| Notifications | `app/stores/notifications.ts`, `app/pages/notifications.vue` |
| OAuth | `server/api/oauth/token.post.ts`, `server/utils/repositories/oauthRepository.ts` |
| Webhooks | `server/api/integrations/withings/webhook.post.ts` |
| Debug | `server/api/debug/*.ts` |
| Orchestration | `server/api/orchestrate/full-sync.post.ts`, `progress.get.ts` |

## Related Trackers

- [issues.md](./issues.md) — Workout structure generation (001–038)
- [SENTRY-ISSUES.md](../../SENTRY-ISSUES.md) — Production Sentry errors
- [TODO_MISSING_FUNCTIONALITY.md](../../TODO_MISSING_FUNCTIONALITY.md) — Missing features
- [issue-management.md](../04-guides/issue-management.md) — GitHub issue standards
