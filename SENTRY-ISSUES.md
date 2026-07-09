# Sentry Issue Tracking

Live tracker for **coach-watts** ([Sentry dashboard](https://newpush-y4.sentry.io/issues/?project=coach-watts&query=is%3Aunresolved)). Last synced from Sentry: **2026-07-09**.

Related docs:

- [conductor/sentry-issues-resolution-plan.md](./conductor/sentry-issues-resolution-plan.md) — April 2026 batch plan (mostly completed; kept for history)
- [docs/issues/062-chat-planned-workout-pollstartedat-crash.md](./docs/issues/062-chat-planned-workout-pollstartedat-crash.md) — COACH-WATTS-1D6 / 1D8
- [docs/issues/196-sentry-no-cefsharp-scanner-filter.md](./docs/issues/196-sentry-no-cefsharp-scanner-filter.md) — COACH-WATTS-117 noise filter

## Active — Unresolved in Sentry

Sorted by recency. Fix committed locally but still firing → see **Fix committed, pending deploy** below.

| Issue ID                                                               | Description                                                      | Users | Events | Last seen | Culprit                          | Notes                                                                                          |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------- | ----- | ------ | --------- | -------------------------------- | ---------------------------------------------------------------------------------------------- |
| [COACH-WATTS-1DG](https://newpush-y4.sentry.io/issues/COACH-WATTS-1DG) | `Unexpected token (29:2)` in `workout-comparison.vue?macro=true` | 1     | 2      | ~30m ago  | `/dashboard`                     | Likely dev HMR / in-progress edit; verify after deploy                                         |
| [COACH-WATTS-D](https://newpush-y4.sentry.io/issues/COACH-WATTS-D)     | `Failed to fetch dynamically imported module`                    | 12    | 25     | ~40m ago  | `/dashboard`                     | Chunk load after deploy; handled by `chunk-error.client.ts`                                    |
| [COACH-WATTS-23](https://newpush-y4.sentry.io/issues/COACH-WATTS-23)   | `FetchError: /api/auth/session` — no response                    | 8     | 14     | ~1h ago   | `/dashboard`                     | Dev server restart / network blip                                                              |
| [COACH-WATTS-1DF](https://newpush-y4.sentry.io/issues/COACH-WATTS-1DF) | `FetchError: /_nuxt/builds/meta/dev.json` — no response          | 1     | 1      | ~1h ago   | `/dashboard`                     | Local dev only                                                                                 |
| [COACH-WATTS-1C4](https://newpush-y4.sentry.io/issues/COACH-WATTS-1C4) | `FetchError: /api/auth/session` — 503                            | 1     | 1      | ~2h ago   | `/dashboard`                     | Server unavailable during restart                                                              |
| [COACH-WATTS-3J](https://newpush-y4.sentry.io/issues/COACH-WATTS-3J)   | `UnhandledRejection: value: undefined`                           | 9     | 10     | ~2h ago   | `/workouts/:id()`                | Fixed — safe task callbacks + page lifecycle guards in workout detail                          |
| [COACH-WATTS-1DE](https://newpush-y4.sentry.io/issues/COACH-WATTS-1DE) | `PrismaClientValidationError`                                    | 0     | 1      | ~2h ago   | `summarize-chat.ts`              | Dev-only; source uses `promptTokens`/`completionTokens` — stale trigger deploy                 |
| [COACH-WATTS-16B](https://newpush-y4.sentry.io/issues/COACH-WATTS-16B) | `Failed to refresh Ultrahuman token: 400`                        | 0     | 22     | ~2h ago   | `ultrahuman.ts`                  | Fix committed; mark FAILED on 400 — verify deploy                                              |
| [COACH-WATTS-1DD](https://newpush-y4.sentry.io/issues/COACH-WATTS-1DD) | `Cannot read properties of null (reading 'subTree')`             | 1     | 1      | ~4h ago   | `/chat`                          | Fixed — chat lifecycle guards + room-scoped message list remount                               |
| [COACH-WATTS-1DC](https://newpush-y4.sentry.io/issues/COACH-WATTS-1DC) | `Cannot read properties of null (reading 'flags')`               | 1     | 1      | ~4h ago   | `/chat`                          | Same cluster                                                                                   |
| [COACH-WATTS-1DB](https://newpush-y4.sentry.io/issues/COACH-WATTS-1DB) | `Cannot read properties of null (reading 'unmount')`             | 1     | 1      | ~4h ago   | `/chat`                          | Same cluster                                                                                   |
| [COACH-WATTS-1DA](https://newpush-y4.sentry.io/issues/COACH-WATTS-1DA) | `Cannot read properties of null (reading 'parentNode')`          | 1     | 2      | ~4h ago   | `/chat`                          | Same cluster as historical COACH-WATTS-1P                                                      |
| [COACH-WATTS-6Z](https://newpush-y4.sentry.io/issues/COACH-WATTS-6Z)   | `Failed to refresh Withings token: Status 503`                   | 0     | 1      | ~5h ago   | `withings.ts`                    | Integration config / provider outage                                                           |
| [COACH-WATTS-YD](https://newpush-y4.sentry.io/issues/COACH-WATTS-YD)   | `Failed to refresh Whoop token: 400`                             | 0     | 1      | ~5h ago   | `whoop.ts`                       | Invalid/revoked token for user                                                                 |
| [COACH-WATTS-1AA](https://newpush-y4.sentry.io/issues/COACH-WATTS-1AA) | `FetchError: /api/auth/session` — no response                    | 3     | 4      | ~7h ago   | `/dashboard`                     | Same class as COACH-WATTS-23                                                                   |
| [COACH-WATTS-1D8](https://newpush-y4.sentry.io/issues/COACH-WATTS-1D8) | `ReferenceError: pollStartedAt is not defined`                   | 7     | 40     | ~8h ago   | `/chat`                          | Fixed in [#062](./docs/issues/062-chat-planned-workout-pollstartedat-crash.md); pending deploy |
| [COACH-WATTS-9](https://newpush-y4.sentry.io/issues/COACH-WATTS-9)     | `Importing a module script failed`                               | 15    | 18     | ~8h ago   | `/chat`                          | Deployment chunk invalidation; reload plugin handles                                           |
| [COACH-WATTS-1D9](https://newpush-y4.sentry.io/issues/COACH-WATTS-1D9) | `undefined is not an object (evaluating 't[n]')`                 | 1     | 1      | ~9h ago   | `/chat`                          | Fixed — `ChatMdcContent` MDC fallback                                                          |
| [COACH-WATTS-4W](https://newpush-y4.sentry.io/issues/COACH-WATTS-4W)   | `Request timeout after 60000ms for type: module`                 | 0     | 3      | ~10h ago  | `/join`                          | Slow module load                                                                               |
| [COACH-WATTS-1CG](https://newpush-y4.sentry.io/issues/COACH-WATTS-1CG) | `undefined is not an object (evaluating 't.labels[0]')`          | 3     | 3      | ~22h ago  | `/workouts/:id()/map`            | Fixed — empty stream label guards in `BaseStreamChart` + map page                              |
| [COACH-WATTS-1D6](https://newpush-y4.sentry.io/issues/COACH-WATTS-1D6) | `ReferenceError: pollStartedAt is not defined`                   | 1     | 6      | ~1d ago   | `/chat`                          | Duplicate of 1D8; same fix                                                                     |
| [COACH-WATTS-1D7](https://newpush-y4.sentry.io/issues/COACH-WATTS-1D7) | `ReferenceError: buildStructureGoalContextBlock is not defined`  | 0     | 4      | ~1d ago   | `generate-structured-workout.ts` | Import exists in source; likely stale deploy                                                   |
| [COACH-WATTS-66](https://newpush-y4.sentry.io/issues/COACH-WATTS-66)   | `RangeError: Maximum call stack size exceeded`                   | 6     | 22     | ~1d ago   | `/plan`                          | Fixed — bounded `flattenWorkoutSteps` in `MiniWorkoutChart`                                    |

[View all unresolved issues in Sentry →](https://newpush-y4.sentry.io/issues/?project=coach-watts&query=is%3Aunresolved)

## Fix Committed — Pending Deploy Verification

| Issue ID              | Local fix                                                 | Doc                                                                   |
| --------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| COACH-WATTS-66        | Bounded `flattenWorkoutSteps` (depth/reps/step caps)      | `app/utils/workout-analytics.ts`, `MiniWorkoutChart.vue`              |
| COACH-WATTS-1CG       | Empty stream label guards                                 | `BaseStreamChart.vue`, `map.vue`                                      |
| COACH-WATTS-1D9       | MDC render error fallback                                 | `ChatMdcContent.vue`                                                  |
| COACH-WATTS-1DA–1DD   | Chat teardown lifecycle guards                            | `chat.vue`, `ChatPlannedWorkoutCard.vue`, `ChatMessageList.vue`       |
| COACH-WATTS-3J        | Safe task callbacks + workout page lifecycle guards       | `useUserRuns.ts`, `workouts/[id]/index.vue`                           |
| COACH-WATTS-1D6 / 1D8 | `pollStartedAt` ref added in `ChatPlannedWorkoutCard.vue` | [#062](./docs/issues/062-chat-planned-workout-pollstartedat-crash.md) |
| COACH-WATTS-16B       | Ultrahuman 400 → mark integration FAILED                  | [resolution plan](./conductor/sentry-issues-resolution-plan.md)       |
| COACH-WATTS-18B       | Null checks in `AdvancedWorkoutMetrics.vue`               | [resolution plan](./conductor/sentry-issues-resolution-plan.md)       |
| COACH-WATTS-118       | try/catch in `ChatTurnService.claimNextQueuedTurn`        | [resolution plan](./conductor/sentry-issues-resolution-plan.md)       |

After deploy: resolve in Sentry if no new events for 24–48h.

## Known Noise / Handled

| Issue ID                                                               | Description                                         | Handling                                                                                                                  |
| ---------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [COACH-WATTS-117](https://newpush-y4.sentry.io/issues/COACH-WATTS-117) | `Object Not Found Matching Id:2, MethodName:update` | Filtered via `ignoreErrors` in `sentry.client.config.ts` ([#196](./docs/issues/196-sentry-no-cefsharp-scanner-filter.md)) |
| COACH-WATTS-D / 9                                                      | Chunk / dynamic import failures                     | `app/plugins/chunk-error.client.ts` auto-reload                                                                           |
| COACH-WATTS-23 / 1AA / 1DF / 1C4                                       | Auth session / dev.json fetch failures              | Dev server restarts; not app bugs                                                                                         |
| [COACH-WATTS-MP](https://newpush-y4.sentry.io/issues/COACH-WATTS-MP)   | `runtime.sendMessage(). Tab not found`              | Browser extension noise                                                                                                   |

## Recently Resolved

| Issue ID                                                               | Description                                 | Resolution                                                           |
| ---------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------- |
| [COACH-WATTS-15P](https://newpush-y4.sentry.io/issues/COACH-WATTS-15P) | `addColorStop` invalid rgba                 | `withOpacity` helper in `ChartRenderer.vue` / `BaseWidget.vue`       |
| [COACH-WATTS-15E](https://newpush-y4.sentry.io/issues/COACH-WATTS-15E) | Prisma `featureFlags` unknown field         | `npx prisma generate`                                                |
| [COACH-WATTS-12T](https://newpush-y4.sentry.io/issues/COACH-WATTS-12T) | Destructure `bum` from null                 | Unregister `useAnalyticsBus` listeners on unmount                    |
| [COACH-WATTS-1P](https://newpush-y4.sentry.io/issues/COACH-WATTS-1P)   | `parentNode` null                           | Fixed listener leaks in `workout-explorer.vue` / `ChartRenderer.vue` |
| [COACH-WATTS-ZT](https://newpush-y4.sentry.io/issues/COACH-WATTS-ZT)   | Undefined `.p` in chat                      | Defensive checks in `ChatMessageContent.vue`                         |
| [COACH-WATTS-7A](https://newpush-y4.sentry.io/issues/COACH-WATTS-7A)   | `session is not defined`                    | Use `event.context.session` from `requireAuth`                       |
| [COACH-WATTS-130](https://newpush-y4.sentry.io/issues/COACH-WATTS-130) | `activities.value.filter is not a function` | `Array.isArray` guard in `activities.vue`                            |
| [COACH-WATTS-ZH](https://newpush-y4.sentry.io/issues/COACH-WATTS-ZH)   | `timezone is not defined`                   | Renamed to `userTimezone` in `trigger/daily-checkin.ts`              |
| [COACH-WATTS-10W](https://newpush-y4.sentry.io/issues/COACH-WATTS-10W) | `i is not a function` on workout detail     | Guard translation fn in `getWorkoutSourceLabel`                      |
| [COACH-WATTS-5X](https://newpush-y4.sentry.io/issues/COACH-WATTS-5X)   | `WorkoutAnalysisReady` not found            | Import alignment + `recommendationHighlights` guards                 |
| [COACH-WATTS-Z7](https://newpush-y4.sentry.io/issues/COACH-WATTS-Z7)   | `absPower is not defined`                   | Removed by refactor                                                  |
| [COACH-WATTS-18B](https://newpush-y4.sentry.io/issues/COACH-WATTS-18B) | `decoupling.toFixed` on null                | Null checks in `AdvancedWorkoutMetrics.vue`                          |

## Maintenance Guidelines

1. **Sync from Sentry** — Run `/seer` or ask the agent to refresh unresolved issues; update the **Active** table above.
2. **New critical issues** — Add a row to **Active** and, if actionable, a matching `docs/issues/NNN-*.md` entry.
3. **After fixing** — Move to **Fix committed, pending deploy** until verified quiet in Sentry, then to **Recently Resolved** and resolve the issue in Sentry.
4. **Noise** — Add `ignoreErrors` patterns in `sentry.client.config.ts` only for confirmed third-party / scanner noise; document in `docs/issues/`.
5. **Batch plans** — Use `conductor/sentry-issues-resolution-plan.md` for multi-issue sprints; archive when complete.
