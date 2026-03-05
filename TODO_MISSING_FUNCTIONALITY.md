# Missing Functionality Recovery TODO

Baseline commit: `ad3f27cd0a0f893c328978d12cffa80c4b589c75` (2026-03-03 23:59:22 +0100)
Comparison target: current working tree (HEAD + uncommitted changes)

## Progress

- [x] Build affected file list from git diff
- [~] Review each affected file diff for removed functionality/sections (high-risk set in progress)
- [~] Restore missing functionality (profile/settings + billing/fitness restored)
- [ ] Verify with tests/smoke checks

## Restored In This Pass

- [x] Restored all 15 files changed in commit `03967277` (profile/settings components) to pre-localization behavior
- [x] Restored `app/pages/fitness/index.vue` to pre-localization behavior
- [x] Restored `app/pages/settings/billing.vue` to pre-localization behavior

## Reviewed As Refactor (No Functionality Drop Found)

- [x] trigger/ingest-strava-streams.ts (logic moved to utility + ingestion-setting gate)
- [x] app/pages/chat.vue (share logic extracted to useResourceShare)
- [x] app/pages/fitness/[id].vue (share logic extracted to useResourceShare)
- [x] app/pages/plan.vue (share logic extracted to useResourceShare)
- [x] app/pages/workouts/planned/[id].vue (share logic extracted to useResourceShare)
- [x] app/pages/profile/athlete.vue (share logic extracted to useResourceShare)

## High-Risk Queue (largest deletions, excluding i18n JSON)

| Status | File                                                              | Added | Deleted |   Net |
| ------ | ----------------------------------------------------------------- | ----: | ------: | ----: |
| [ ]    | `pnpm-lock.yaml`                                                  | 10416 |    3381 | +7035 |
| [ ]    | `app/pages/workouts/[id]/index.vue`                               |   564 |     593 |   -29 |
| [ ]    | `app/pages/works-with.vue`                                        |   191 |     152 |   +39 |
| [x]    | `trigger/ingest-strava-streams.ts`                                |    19 |     149 |  -130 |
| [ ]    | `app/pages/activities.vue`                                        |   217 |     136 |   +81 |
| [ ]    | `app/pages/performance/index.vue`                                 |   148 |     136 |   +12 |
| [ ]    | `app/pages/login.vue`                                             |   475 |     107 |  +368 |
| [ ]    | `server/utils/quotas/engine.ts`                                   |   110 |      88 |   +22 |
| [x]    | `app/pages/chat.vue`                                              |    25 |      76 |   -51 |
| [ ]    | `app/layouts/default.vue`                                         |   133 |      70 |   +63 |
| [ ]    | `app/pages/nutrition/index.vue`                                   |    84 |      55 |   +29 |
| [ ]    | `app/components/dashboard/PerformanceScoresCard.vue`              |    47 |      45 |    +2 |
| [ ]    | `trigger/ingest-strava.ts`                                        |    67 |      44 |   +23 |
| [ ]    | `app/pages/settings/developer.vue`                                |    65 |      41 |   +24 |
| [ ]    | `server/utils/services/bodyMeasurementService.ts`                 |   110 |      41 |   +69 |
| [ ]    | `app/components/chat/ChatRoomList.vue`                            |    48 |      39 |    +9 |
| [ ]    | `app/pages/help-center.vue`                                       |    36 |      39 |    -3 |
| [ ]    | `cli/backfill/body-measurements.ts`                               |    20 |      34 |   -14 |
| [ ]    | `app/components/chat/ChatInput.vue`                               |    38 |      33 |    +5 |
| [ ]    | `app/pages/fitness/[id].vue`                                      |     5 |      31 |   -26 |
| [x]    | `app/pages/plan.vue`                                              |     5 |      31 |   -26 |
| [ ]    | `app/pages/workouts/planned/[id].vue`                             |     5 |      31 |   -26 |
| [ ]    | `app/components/share/ShareAccessPanel.vue`                       |   134 |      30 |  +104 |
| [ ]    | `app/components/dashboard/OnboardingView.vue`                     |    38 |      29 |    +9 |
| [ ]    | `app/components/dashboard/TrainingRecommendationCard.vue`         |    36 |      29 |    +7 |
| [ ]    | `docs/04-guides/localization.md`                                  |    18 |      28 |   -10 |
| [x]    | `app/pages/profile/athlete.vue`                                   |     5 |      27 |   -22 |
| [ ]    | `app/pages/dashboard.vue`                                         |    43 |      26 |   +17 |
| [ ]    | `app/components/chat/ChatWelcomeTips.vue`                         |    16 |      21 |    -5 |
| [ ]    | `app/components/dashboard/ShareCoachWattsModal.vue`               |   137 |      21 |  +116 |
| [ ]    | `trigger/ingest-strava-activity.ts`                               |    50 |      18 |   +32 |
| [ ]    | `app/components/dashboard/DashboardCreateAdHocModal.vue`          |    34 |      16 |   +18 |
| [ ]    | `app/components/dashboard/DataSyncStatusCard.vue`                 |    43 |      16 |   +27 |
| [ ]    | `trigger/analyze-plan-adherence.ts`                               |     7 |      15 |    -8 |
| [ ]    | `server/api/auth/[...].ts`                                        |   120 |      13 |  +107 |
| [ ]    | `app/pages/join.vue`                                              |    91 |      12 |   +79 |
| [ ]    | `trigger/analyze-workout.ts`                                      |    11 |      12 |    -1 |
| [ ]    | `app/components/AiQuickCapture.vue`                               |    14 |      10 |    +4 |
| [ ]    | `app/pages/profile/settings.vue`                                  |    37 |      10 |   +27 |
| [ ]    | `app/components/dashboard/MissingDataBanner.vue`                  |    30 |       9 |   +21 |
| [ ]    | `app/components/workouts/WorkoutSummary.vue`                      |    12 |       9 |    +3 |
| [ ]    | `app/pages/settings/ai.vue`                                       |    10 |       9 |    +1 |
| [ ]    | `app/components/dashboard/DashboardRefineRecommendationModal.vue` |    17 |       7 |   +10 |
| [ ]    | `app/components/dashboard/RecentActivityCard.vue`                 |    14 |       7 |    +7 |
| [ ]    | `app/components/dashboard/TriggerMonitor.vue`                     |     9 |       7 |    +2 |
| [ ]    | `RULES.md`                                                        |    24 |       6 |   +18 |
| [ ]    | `app/components/ImpersonationBanner.vue`                          |     9 |       6 |    +3 |
| [ ]    | `app/plugins/tolgee.ts`                                           |   257 |       6 |  +251 |
| [ ]    | `server/api/webhooks/resend.post.ts`                              |     0 |       6 |    -6 |
| [ ]    | `server/utils/workout-converter.ts`                               |    18 |       6 |   +12 |
| [ ]    | `app/components/dashboard/AthleteProfileCard.vue`                 |     9 |       5 |    +4 |
| [ ]    | `docs/04-guides/cli-reference.md`                                 |    12 |       5 |    +7 |
| [ ]    | `app/components/CoachingBanner.vue`                               |     6 |       4 |    +2 |
| [ ]    | `scripts/backfill-body-measurements.ts`                           |     5 |       3 |    +2 |
| [ ]    | `server/api/recommendations/[id]/accept.post.ts`                  |    20 |       3 |   +17 |
| [ ]    | `tests/unit/server/utils/ai-tools/planning.test.ts`               |   183 |       3 |  +180 |
| [ ]    | `.github/workflows/debug-trigger-auth.yml`                        |     2 |       2 |    +0 |
| [ ]    | `app/components/chat/ChatSidebar.vue`                             |     5 |       2 |    +3 |
| [ ]    | `app/components/dashboard/SystemMessageCard.vue`                  |     5 |       2 |    +3 |
| [x]    | `app/components/settings/ConnectedApps.vue`                       |    27 |       2 |   +25 |
| [ ]    | `app/middleware/guest.ts`                                         |    10 |       2 |    +8 |
| [ ]    | `app/middleware/oauth-auth.ts`                                    |    10 |       2 |    +8 |
| [ ]    | `app/middleware/onboarding.global.ts`                             |     8 |       2 |    +6 |
| [ ]    | `package.json`                                                    |     4 |       2 |    +2 |
| [ ]    | `server/api/chat/messages.post.ts`                                |     5 |       2 |    +3 |
| [ ]    | `server/api/integrations/strava/callback.get.ts`                  |     4 |       2 |    +2 |
| [ ]    | `server/api/nutrition/[id]/items.patch.ts`                        |     2 |       2 |    +0 |
| [ ]    | `server/api/websocket.ts`                                         |     5 |       2 |    +3 |
| [ ]    | `server/utils/ai-tools/workouts.ts`                               |     2 |       2 |    +0 |
| [ ]    | `.github/workflows/deploy.yml`                                    |     1 |       1 |    +0 |
| [ ]    | `.github/workflows/reusable-trigger-deploy.yml`                   |     1 |       1 |    +0 |
| [ ]    | `app/components/chat/ChatDomainToolCard.vue`                      |    29 |       1 |   +28 |
| [ ]    | `app/components/nutrition/FoodItemModal.vue`                      |     3 |       1 |    +2 |
| [ ]    | `app/middleware/auth.ts`                                          |     9 |       1 |    +8 |
| [ ]    | `app/pages/settings/apps.vue`                                     |     4 |       1 |    +3 |
| [ ]    | `app/pages/share/workouts/[token].vue`                            |    10 |       1 |    +9 |
| [ ]    | `app/pages/support.vue`                                           |     1 |       1 |    +0 |
| [ ]    | `nuxt.config.ts`                                                  |     1 |       1 |    +0 |
| [ ]    | `server/api/profile/dashboard.get.ts`                             |     3 |       1 |    +2 |
| [ ]    | `server/api/profile/index.get.ts`                                 |    17 |       1 |   +16 |
| [ ]    | `server/api/user/me.get.ts`                                       |     2 |       1 |    +1 |
| [ ]    | `server/api/wellness/[wellnessId].patch.ts`                       |     2 |       1 |    +1 |
| [ ]    | `server/api/wellness/index.post.ts`                               |     2 |       1 |    +1 |
| [ ]    | `server/utils/ai-tools/planning.ts`                               |   139 |       1 |  +138 |
| [ ]    | `server/utils/integration-settings.ts`                            |     2 |       1 |    +1 |
| [ ]    | `server/utils/services/garminService.ts`                          |     2 |       1 |    +1 |
| [ ]    | `server/utils/services/intervalsService.ts`                       |     2 |       1 |    +1 |
| [ ]    | `server/utils/services/ouraService.ts`                            |     2 |       1 |    +1 |
| [ ]    | `server/utils/services/stravaService.ts`                          |    25 |       1 |   +24 |
| [ ]    | `tests/unit/server/utils/services/metabolicService.test.ts`       |    20 |       1 |   +19 |
| [ ]    | `trigger/adjust-structured-workout.ts`                            |    11 |       1 |   +10 |
| [ ]    | `trigger/generate-structured-workout.ts`                          |    11 |       1 |   +10 |
| [ ]    | `trigger/ingest-withings.ts`                                      |     2 |       1 |    +1 |
| [x]    | `app/components/profile/BasicSettings.vue`                        |   148 |       0 |  +148 |
| [ ]    | `app/composables/useResourceShare.ts`                             |    58 |       0 |   +58 |
| [ ]    | `app/pages/data.vue`                                              |     1 |       0 |    +1 |
| [ ]    | `app/stores/user.ts`                                              |     1 |       0 |    +1 |
| [ ]    | `cli/translations/index.ts`                                       |     4 |       0 |    +4 |
| [ ]    | `cli/translations/sync-all.ts`                                    |   204 |       0 |  +204 |
| [ ]    | `cli/translations/untranslated.ts`                                |   129 |       0 |  +129 |

## Full Affected Files Checklist

- [ ] M `.github/workflows/debug-trigger-auth.yml`
- [ ] M `.github/workflows/deploy.yml`
- [ ] M `.github/workflows/reusable-trigger-deploy.yml`
- [ ] M `RULES.md`
- [ ] M `app/components/AiQuickCapture.vue`
- [ ] M `app/components/CoachingBanner.vue`
- [ ] M `app/components/ImpersonationBanner.vue`
- [ ] M `app/components/chat/ChatDomainToolCard.vue`
- [ ] M `app/components/chat/ChatInput.vue`
- [ ] M `app/components/chat/ChatRoomList.vue`
- [ ] M `app/components/chat/ChatSidebar.vue`
- [ ] M `app/components/chat/ChatWelcomeTips.vue`
- [ ] M `app/components/dashboard/AthleteProfileCard.vue`
- [ ] M `app/components/dashboard/DashboardCreateAdHocModal.vue`
- [ ] M `app/components/dashboard/DashboardRefineRecommendationModal.vue`
- [ ] M `app/components/dashboard/DataSyncStatusCard.vue`
- [ ] M `app/components/dashboard/MissingDataBanner.vue`
- [ ] M `app/components/dashboard/OnboardingView.vue`
- [ ] M `app/components/dashboard/PerformanceScoresCard.vue`
- [ ] M `app/components/dashboard/RecentActivityCard.vue`
- [ ] M `app/components/dashboard/ShareCoachWattsModal.vue`
- [ ] M `app/components/dashboard/SystemMessageCard.vue`
- [ ] M `app/components/dashboard/TrainingRecommendationCard.vue`
- [ ] M `app/components/dashboard/TriggerMonitor.vue`
- [ ] M `app/components/nutrition/FoodItemModal.vue`
- [x] M `app/components/profile/BasicSettings.vue`
- [x] M `app/components/settings/ConnectedApps.vue`
- [ ] M `app/components/share/ShareAccessPanel.vue`
- [ ] M `app/components/workouts/WorkoutSummary.vue`
- [ ] A `app/composables/useResourceShare.ts`
- [x] A `app/i18n/de/activities.json`
- [x] M `app/i18n/de/auth.json`
- [x] A `app/i18n/de/chat.json`
- [x] M `app/i18n/de/common.json`
- [x] M `app/i18n/de/community.json`
- [x] A `app/i18n/de/dashboard.json`
- [x] A `app/i18n/de/fitness.json`
- [x] M `app/i18n/de/hero.json`
- [x] A `app/i18n/de/hu-bento.json`
- [x] A `app/i18n/de/legend.json`
- [x] M `app/i18n/de/nutrition.json`
- [x] A `app/i18n/de/onboarding.json`
- [x] A `app/i18n/de/performance.json`
- [x] A `app/i18n/de/profile.json`
- [x] A `app/i18n/de/settings.json`
- [x] A `app/i18n/de/workout-tooltips.json`
- [x] A `app/i18n/de/workout.json`
- [x] A `app/i18n/de/works-with.json`
- [x] A `app/i18n/en/activities.json`
- [x] M `app/i18n/en/auth.json`
- [x] A `app/i18n/en/chat.json`
- [x] M `app/i18n/en/common.json`
- [x] A `app/i18n/en/dashboard.json`
- [x] A `app/i18n/en/fitness.json`
- [x] M `app/i18n/en/hero.json`
- [x] A `app/i18n/en/hu-bento.json`
- [x] A `app/i18n/en/legend.json`
- [x] M `app/i18n/en/nutrition.json`
- [x] A `app/i18n/en/onboarding.json`
- [x] A `app/i18n/en/performance.json`
- [x] A `app/i18n/en/profile.json`
- [x] A `app/i18n/en/settings.json`
- [x] A `app/i18n/en/workout-tooltips.json`
- [x] A `app/i18n/en/workout.json`
- [x] A `app/i18n/en/works-with.json`
- [x] A `app/i18n/fr/activities.json`
- [x] M `app/i18n/fr/auth.json`
- [x] A `app/i18n/fr/chat.json`
- [x] M `app/i18n/fr/common.json`
- [x] M `app/i18n/fr/community.json`
- [x] A `app/i18n/fr/dashboard.json`
- [x] A `app/i18n/fr/fitness.json`
- [x] M `app/i18n/fr/hero.json`
- [x] A `app/i18n/fr/hu-bento.json`
- [x] A `app/i18n/fr/legend.json`
- [x] M `app/i18n/fr/nutrition.json`
- [x] A `app/i18n/fr/onboarding.json`
- [x] A `app/i18n/fr/performance.json`
- [x] A `app/i18n/fr/profile.json`
- [x] A `app/i18n/fr/settings.json`
- [x] A `app/i18n/fr/workout-tooltips.json`
- [x] A `app/i18n/fr/workout.json`
- [x] A `app/i18n/fr/works-with.json`
- [x] A `app/i18n/hu/activities.json`
- [x] M `app/i18n/hu/auth.json`
- [x] A `app/i18n/hu/chat.json`
- [x] M `app/i18n/hu/common.json`
- [x] M `app/i18n/hu/community.json`
- [x] A `app/i18n/hu/dashboard.json`
- [x] A `app/i18n/hu/fitness.json`
- [x] M `app/i18n/hu/hero.json`
- [x] A `app/i18n/hu/legend.json`
- [x] M `app/i18n/hu/nutrition.json`
- [x] A `app/i18n/hu/onboarding.json`
- [x] A `app/i18n/hu/performance.json`
- [x] A `app/i18n/hu/profile.json`
- [x] A `app/i18n/hu/settings.json`
- [x] A `app/i18n/hu/workout-tooltips.json`
- [x] A `app/i18n/hu/workout.json`
- [x] A `app/i18n/hu/works-with.json`
- [x] A `app/i18n/it/activities.json`
- [x] M `app/i18n/it/auth.json`
- [x] A `app/i18n/it/chat.json`
- [x] M `app/i18n/it/common.json`
- [x] M `app/i18n/it/community.json`
- [x] A `app/i18n/it/dashboard.json`
- [x] A `app/i18n/it/fitness.json`
- [x] M `app/i18n/it/hero.json`
- [x] A `app/i18n/it/hu-bento.json`
- [x] A `app/i18n/it/legend.json`
- [x] M `app/i18n/it/nutrition.json`
- [x] A `app/i18n/it/onboarding.json`
- [x] A `app/i18n/it/performance.json`
- [x] A `app/i18n/it/profile.json`
- [x] A `app/i18n/it/settings.json`
- [x] A `app/i18n/it/workout-tooltips.json`
- [x] A `app/i18n/it/workout.json`
- [x] A `app/i18n/it/works-with.json`
- [x] A `app/i18n/nl/activities.json`
- [x] M `app/i18n/nl/auth.json`
- [x] A `app/i18n/nl/chat.json`
- [x] M `app/i18n/nl/common.json`
- [x] M `app/i18n/nl/community.json`
- [x] A `app/i18n/nl/dashboard.json`
- [x] A `app/i18n/nl/fitness.json`
- [x] M `app/i18n/nl/hero.json`
- [x] A `app/i18n/nl/hu-bento.json`
- [x] A `app/i18n/nl/legend.json`
- [x] M `app/i18n/nl/nutrition.json`
- [x] A `app/i18n/nl/onboarding.json`
- [x] A `app/i18n/nl/performance.json`
- [x] A `app/i18n/nl/profile.json`
- [x] A `app/i18n/nl/settings.json`
- [x] A `app/i18n/nl/workout-tooltips.json`
- [x] A `app/i18n/nl/workout.json`
- [x] A `app/i18n/nl/works-with.json`
- [ ] M `app/layouts/default.vue`
- [ ] M `app/middleware/auth.ts`
- [ ] M `app/middleware/guest.ts`
- [ ] M `app/middleware/oauth-auth.ts`
- [ ] M `app/middleware/onboarding.global.ts`
- [ ] M `app/pages/activities.vue`
- [x] M `app/pages/chat.vue`
- [ ] M `app/pages/dashboard.vue`
- [ ] M `app/pages/data.vue`
- [ ] M `app/pages/fitness/[id].vue`
- [ ] M `app/pages/help-center.vue`
- [ ] M `app/pages/join.vue`
- [ ] M `app/pages/login.vue`
- [ ] M `app/pages/nutrition/index.vue`
- [ ] M `app/pages/performance/index.vue`
- [x] M `app/pages/plan.vue`
- [x] M `app/pages/profile/athlete.vue`
- [ ] M `app/pages/profile/settings.vue`
- [ ] M `app/pages/settings/ai.vue`
- [ ] M `app/pages/settings/apps.vue`
- [ ] M `app/pages/settings/developer.vue`
- [ ] M `app/pages/share/workouts/[token].vue`
- [ ] M `app/pages/support.vue`
- [ ] M `app/pages/workouts/[id]/index.vue`
- [ ] M `app/pages/workouts/planned/[id].vue`
- [ ] M `app/pages/works-with.vue`
- [ ] M `app/plugins/tolgee.ts`
- [ ] M `app/stores/user.ts`
- [ ] M `cli/backfill/body-measurements.ts`
- [ ] M `cli/translations/index.ts`
- [ ] A `cli/translations/sync-all.ts`
- [ ] A `cli/translations/untranslated.ts`
- [ ] M `docs/04-guides/cli-reference.md`
- [ ] M `docs/04-guides/localization.md`
- [ ] A `docs/translation-inventory.md`
- [ ] M `nuxt.config.ts`
- [ ] M `package.json`
- [ ] M `pnpm-lock.yaml`
- [ ] M `scripts/backfill-body-measurements.ts`
- [ ] M `server/api/auth/[...].ts`
- [ ] M `server/api/chat/messages.post.ts`
- [ ] M `server/api/integrations/strava/callback.get.ts`
- [ ] M `server/api/nutrition/[id]/items.patch.ts`
- [ ] M `server/api/profile/dashboard.get.ts`
- [ ] M `server/api/profile/index.get.ts`
- [ ] M `server/api/recommendations/[id]/accept.post.ts`
- [ ] A `server/api/share/workouts/[token]/image.get.ts`
- [ ] M `server/api/user/me.get.ts`
- [ ] M `server/api/webhooks/resend.post.ts`
- [ ] M `server/api/websocket.ts`
- [ ] M `server/api/wellness/[wellnessId].patch.ts`
- [ ] M `server/api/wellness/index.post.ts`
- [ ] A `server/assets/templates/sharing/activity-modern.svg`
- [ ] M `server/utils/ai-tools/planning.ts`
- [ ] M `server/utils/ai-tools/workouts.ts`
- [ ] M `server/utils/integration-settings.ts`
- [ ] M `server/utils/intervals-sync.ts`
- [ ] M `server/utils/quotas/engine.ts`
- [ ] M `server/utils/services/bodyMeasurementService.ts`
- [ ] M `server/utils/services/chatContextService.ts`
- [ ] M `server/utils/services/garminService.ts`
- [ ] M `server/utils/services/intervalsService.ts`
- [ ] M `server/utils/services/ouraService.ts`
- [ ] M `server/utils/services/stravaService.ts`
- [ ] A `server/utils/sharing/image-generator.ts`
- [ ] M `server/utils/workout-converter.test.ts`
- [ ] M `server/utils/workout-converter.ts`
- [ ] M `tests/unit/server/utils/ai-tools/planning.test.ts`
- [ ] A `tests/unit/server/utils/services/bodyMeasurementService.test.ts`
- [ ] M `tests/unit/server/utils/services/chatContextService.test.ts`
- [ ] M `tests/unit/server/utils/services/mealRecommendationService.test.ts`
- [ ] M `tests/unit/server/utils/services/metabolicService.test.ts`
- [ ] M `trigger/adjust-structured-workout.ts`
- [ ] M `trigger/analyze-plan-adherence.ts`
- [ ] M `trigger/analyze-workout.ts`
- [ ] M `trigger/generate-ad-hoc-workout.ts`
- [ ] M `trigger/generate-structured-workout.ts`
- [ ] M `trigger/generate-weekly-plan.ts`
- [ ] M `trigger/ingest-strava-activity.ts`
- [x] M `trigger/ingest-strava-streams.ts`
- [ ] M `trigger/ingest-strava.ts`
- [ ] M `trigger/ingest-withings.ts`
- [ ] A `trigger/utils/planned-workout-targets.test.ts`
- [ ] A `trigger/utils/planned-workout-targets.ts`
- [ ] A `trigger/utils/strava-stream-ingestion.ts`
