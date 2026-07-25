# Sentry Issue Tracking

Live tracker for **this repo** ([Sentry dashboard](https://newpush-y4.sentry.io/issues/?project=coach-watts&query=is%3Aunresolved)). Last synced from Sentry: **2026-07-24**.

## Which Sentry project (agents — read this first)

| Field            | Value                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| **Organization** | `newpush-y4`                                                                   |
| **Project**      | `coach-watts`                                                                  |
| **Region URL**   | `https://de.sentry.io`                                                         |
| **Dashboard**    | https://newpush-y4.sentry.io/issues/?project=coach-watts&query=is%3Aunresolved |
| **Env vars**     | `SENTRY_ORG=newpush-y4`, `SENTRY_PROJECT=coach-watts` (see `.env`)             |

When using the Sentry MCP (`search_issues`, `search_events`, `get_sentry_resource`, `update_issue`), **always** pass:

- `organizationSlug: "newpush-y4"`
- `regionUrl: "https://de.sentry.io"`
- `projectSlug: "coach-watts"` (or filter with `project:coach-watts`)

**Do not use** `watt-mind` / `coach-watts-app` — that is the **mobile companion app** (separate codebase). Issue IDs there look like `COACH-WATTS-APP-*`. This web/backend app uses `COACH-WATTS-*` (no `-APP`).

Also out of scope for this tracker: `newpush-y4` / `platform` (e.g. [PLATFORM-CA](https://newpush-y4.sentry.io/issues/PLATFORM-CA)).

Related docs:

- [conductor/sentry-issues-resolution-plan.md](./conductor/sentry-issues-resolution-plan.md) — April 2026 batch plan (mostly completed; kept for history)
- [docs/issues/062-chat-planned-workout-pollstartedat-crash.md](./docs/issues/062-chat-planned-workout-pollstartedat-crash.md) — COACH-WATTS-1D6 / 1D8
- [docs/issues/196-sentry-no-cefsharp-scanner-filter.md](./docs/issues/196-sentry-no-cefsharp-scanner-filter.md) — COACH-WATTS-117 noise filter
- [docs/issues/323-sentry-chunk-load-deploy-noise.md](./docs/issues/323-sentry-chunk-load-deploy-noise.md) — chunk-load cluster (C / 9 / 1ER)

## Active — Unresolved in Sentry

Sorted by recency. These still need a fix, deploy verification, or ongoing monitoring.

| Issue ID                                                               | Description                                 | Users | Events | Last seen | Culprit       | Notes                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------- | ----- | ------ | --------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [COACH-WATTS-1ES](https://newpush-y4.sentry.io/issues/COACH-WATTS-1ES) | `visibleElements` of undefined              | 1     | 1      | ~5d ago   | `/dashboard`  | Chart.js animator `beforeDraw` after dashboard sync on `vps.wyknas.site` (`release coach@0.5.24`). Same family as prior annotation init races; `ensureChartJsAnnotationDefaults` / `safeChartUpdate` may not cover destroy-during-animation. **Watch / harden chart destroy**. |
| [COACH-WATTS-9](https://newpush-y4.sentry.io/issues/COACH-WATTS-9)     | `Importing a module script failed`          | 10    | 12     | ~21h ago  | `/chat`       | Chunk-load cluster — see playbook. Prod events still trickling; product mitigation shipped. Optional: Ignore/Resolve.                                                                                                                                                          |
| [COACH-WATTS-1B9](https://newpush-y4.sentry.io/issues/COACH-WATTS-1B9) | Auth session fetch load failed              | 7     | 7      | ~1d ago   | `/activities` | Mixed prod/dev session blips — Known Noise.                                                                                                                                                                                                                                    |
| [COACH-WATTS-1ER](https://newpush-y4.sentry.io/issues/COACH-WATTS-1ER) | `can't access property "p", e is undefined` | 1     | 2      | ~2d ago   | `/chat`       | **Watch only** — Vue cascade after chunk miss (paired with C). Do **not** add to `ignoreErrors`.                                                                                                                                                                               |
| [COACH-WATTS-C](https://newpush-y4.sentry.io/issues/COACH-WATTS-C)     | `error loading dynamically imported module` | 7     | 15     | ~2d ago   | `/chat`       | **Known noise**. Product fix shipped — see [Chunk load playbook](#chunk-load-playbook). Optional: Ignore/Resolve.                                                                                                                                                              |

### Investigation summary (2026-07-24)

| Priority         | Issues            | Verdict                                                                                                  |
| ---------------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| Closed           | **1EP, 1EV, 1ET** | Resolved in Sentry + filtered in `sentry.server.config.ts` (local Trigger down / chat abort / vite IPC). |
| Optional hygiene | **9, C, 1B9**     | Already mitigated / known noise; close in Sentry when quiet.                                             |
| Maybe code       | **1ES**           | Single prod Chart.js teardown race on dashboard; low urgency (1 event).                                  |
| Watch            | **1ER**           | Only dig if it appears without a paired chunk-load error.                                                |

**Out of scope:** [PLATFORM-CA](https://newpush-y4.sentry.io/issues/PLATFORM-CA) (`fbq is not defined`) is GTM / Meta Pixel on `platform.newpush.com`, not this app. Mobile app errors live under `watt-mind` / `coach-watts-app`.

[View all unresolved issues in Sentry →](https://newpush-y4.sentry.io/issues/?project=coach-watts&query=is%3Aunresolved)

## Chunk load playbook

Post-deploy, stale tabs request old hashed `/_nuxt/*.js` files → dynamic import / module script failures (often on `/chat`). Secondary Vue errors can fire in the same session.

**Already in place**

| Layer         | Where                                    | Behavior                                                                                                                       |
| ------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Auto-reload   | `app/plugins/chunk-error.client.ts`      | `app:chunkError` + `window` `error`; one reload via `?reload=` + 10s `sessionStorage` loop guard                               |
| Early catch   | `nuxt.config.ts` head script             | Same message matchers before the Nuxt plugin loads                                                                             |
| Sentry filter | `sentry.client.config.ts` `ignoreErrors` | `Failed to fetch dynamically imported module`, `Importing a module script failed`, `error loading dynamically imported module` |

**Next steps (no urgent code change)**

1. After a real deploy, spot-check `/chat` on an old tab (Firefox Mobile / Safari): chunk fail → one reload → page works.
2. Keep 1ER open until quiet; resolve if it stays a one-off cascade.
3. Resolve or Ignore C / 9 in Sentry as confirmed noise once the quiet window looks good.
4. Extend `ignoreErrors` / `beforeSend` only for new _chunk message variants_ that still slip through — never for generic minified Vue strings like `can't access property "p"`.

Full write-up: [#323](./docs/issues/323-sentry-chunk-load-deploy-noise.md).

## Fix Committed — Pending Deploy Verification

Move to **Recently Resolved** and **resolve in Sentry** once deployed and quiet for 24–48h.

| Issue ID                                      | Local fix                                                 | Doc                                                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| COACH-WATTS-66                                | Bounded `flattenWorkoutSteps` (depth/reps/step caps)      | `app/utils/workout-analytics.ts`, `MiniWorkoutChart.vue`                                                                             |
| COACH-WATTS-1CG                               | Empty stream label guards                                 | `BaseStreamChart.vue`, `map.vue`                                                                                                     |
| COACH-WATTS-1D9                               | MDC render error fallback                                 | `ChatMdcContent.vue`                                                                                                                 |
| COACH-WATTS-1DA–1DD                           | Chat teardown lifecycle guards                            | `chat.vue`, `ChatPlannedWorkoutCard.vue`, `ChatMessageList.vue`                                                                      |
| COACH-WATTS-1D6 / 1D8                         | `pollStartedAt` ref added in `ChatPlannedWorkoutCard.vue` | [#062](./docs/issues/062-chat-planned-workout-pollstartedat-crash.md)                                                                |
| COACH-WATTS-1E2 / 1E0 / 1DS / 1DR / 1DP / 1DY | `DataCloneError` on profile save / dashboard settings     | `BasicSettings.vue` (`pickBasicProfilePayload` + `toRaw`), `profile/settings.vue` (`snapshotState`), `user.ts` (`cloneSerializable`) |
| COACH-WATTS-1E1                               | `deviation.toLowerCase()` on undefined                    | `PlanAdherence.vue` — filter invalid deviations + safe helper                                                                        |
| COACH-WATTS-1DT / 1DV / 1E3 / 1E6             | Chart.js annotation plugin init race on workout charts    | `app/utils/chartjs-annotation.ts`, `app/plugins/chartjs.client.ts`, `ChartRenderer.vue`, `BaseWidget.vue`                            |
| COACH-WATTS-1DX / 1DW                         | Deprecated `gemini-3-pro-preview` + undefined `usage`     | `ai-config.ts` (model alias), `gemini.ts` (`resolveModelId`, `logUsage` guard)                                                       |
| COACH-WATTS-1DJ                               | `reasoningText` passed to Prisma instead of `reasoning`   | `activityRecommendationRepository.createProcessingPlaceholder`, `today.post.ts`                                                      |
| COACH-WATTS-16B / YD / 6Z                     | Token refresh spamming Sentry on revoked/outage tokens    | `integration-errors.ts`, `ultrahuman.ts` / `whoop.ts` / `withings.ts`, ingest tasks, `trigger/init.ts`                               |

## Known Noise / Handled

| Issue ID                                                               | Description                                              | Handling                                                                                                                                         |
| ---------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [COACH-WATTS-117](https://newpush-y4.sentry.io/issues/COACH-WATTS-117) | `Object Not Found Matching Id:*, MethodName:update`      | Filtered via `ignoreErrors` in `sentry.client.config.ts` ([#196](./docs/issues/196-sentry-no-cefsharp-scanner-filter.md)); **ignored in Sentry** |
| COACH-WATTS-D / 9 / C / 57 / 1E9 / 1ER                                 | Chunk / dynamic import failures (+ Vue cascade)          | Auto-reload + `ignoreErrors` — see [Chunk load playbook](#chunk-load-playbook) and [#323](./docs/issues/323-sentry-chunk-load-deploy-noise.md)   |
| COACH-WATTS-23 / 1AA / 1B9 / 1DF / 1C4 / 1E8 / 50                      | Auth session / dev.json fetch failures (incl. 404)       | Dev server restarts / deploy; not app bugs                                                                                                       |
| COACH-WATTS-1EC / 1EG                                                  | `/api/profile/quotas` fetch 401 / no response            | Dev session blips during local work                                                                                                              |
| [COACH-WATTS-1E4](https://newpush-y4.sentry.io/issues/COACH-WATTS-1E4) | `no such table: _content_content`                        | Nuxt Content DB not initialized in dev; filtered in `sentry.server.config.ts` `beforeSend`                                                       |
| COACH-WATTS-1EB / 1DG / 1DH / 1DE                                      | Vite `?macro=true` syntax errors                         | Transient dev HMR / in-progress edits                                                                                                            |
| COACH-WATTS-1EP / 1EV / 1ET                                            | Local Trigger `:8000` 502 / chat `terminated` / vite IPC | Dev-only with `SENTRY_ENABLED`; **resolved in Sentry 2026-07-24**; filtered in `sentry.server.config.ts` `beforeSend`                            |
| COACH-WATTS-1EQ                                                        | Garmin authorize `Bad Gateway` on localhost              | Local proxy to `:7900` down / teammate `SENTRY_ENABLED`; **resolved in Sentry 2026-07-17**                                                       |
| COACH-WATTS-1EN / 1EM / 1EK / 1EJ / 1EH / 1DC / 1E5                    | Local HMR / dashboard / docs noise                       | Pre–opt-in-gate or local-only; **resolved in Sentry 2026-07-17**                                                                                 |
| [COACH-WATTS-MP](https://newpush-y4.sentry.io/issues/COACH-WATTS-MP)   | `runtime.sendMessage(). Tab not found`                   | Browser extension noise                                                                                                                          |

## Recently Resolved

| Issue ID                                                                                                                                                                                                                                                                                                                                                                                                                                             | Description                                    | Resolution                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [COACH-WATTS-1EP](https://newpush-y4.sentry.io/issues/COACH-WATTS-1EP) / [1EV](https://newpush-y4.sentry.io/issues/COACH-WATTS-1EV) / [1ET](https://newpush-y4.sentry.io/issues/COACH-WATTS-1ET)                                                                                                                                                                                                                                                     | Local Trigger / chat abort / vite IPC noise    | Resolved in Sentry 2026-07-24; `beforeSend` filters in `sentry.server.config.ts`                                                        |
| [COACH-WATTS-1EQ](https://newpush-y4.sentry.io/issues/COACH-WATTS-1EQ)                                                                                                                                                                                                                                                                                                                                                                               | Garmin authorize Bad Gateway (dev)             | Local Garmin proxy noise; resolved in Sentry 2026-07-17                                                                                 |
| [COACH-WATTS-1EN](https://newpush-y4.sentry.io/issues/COACH-WATTS-1EN) / [1EM](https://newpush-y4.sentry.io/issues/COACH-WATTS-1EM) / [1EK](https://newpush-y4.sentry.io/issues/COACH-WATTS-1EK) / [1EJ](https://newpush-y4.sentry.io/issues/COACH-WATTS-1EJ) / [1EH](https://newpush-y4.sentry.io/issues/COACH-WATTS-1EH) / [1DC](https://newpush-y4.sentry.io/issues/COACH-WATTS-1DC) / [1E5](https://newpush-y4.sentry.io/issues/COACH-WATTS-1E5) | Local HMR / dashboard / docs noise             | Dev-only; resolved in Sentry 2026-07-17                                                                                                 |
| [COACH-WATTS-1EF](https://newpush-y4.sentry.io/issues/COACH-WATTS-1EF)                                                                                                                                                                                                                                                                                                                                                                               | `$setup.t.value is not a function`             | `accountMenuAriaLabel` computed in `MobileSidebarFooter.vue` ([#303](./docs/issues/303-mobile-sidebar-footer-aria-label-regression.md)) |
| [COACH-WATTS-1EE](https://newpush-y4.sentry.io/issues/COACH-WATTS-1EE)                                                                                                                                                                                                                                                                                                                                                                               | `Cannot access 'tr' before initialization`     | Recovery `useHead`/`tr` ordering ([#282](./docs/issues/282-recovery-head-unmount-breaks-navigation.md))                                 |
| [COACH-WATTS-1ED](https://newpush-y4.sentry.io/issues/COACH-WATTS-1ED)                                                                                                                                                                                                                                                                                                                                                                               | `dispose` on Recovery unmount                  | Same as 1EE                                                                                                                             |
| [COACH-WATTS-1DA](https://newpush-y4.sentry.io/issues/COACH-WATTS-1DA)                                                                                                                                                                                                                                                                                                                                                                               | `parentNode` null on dashboard                 | Cascade from 1EF during mobile validation                                                                                               |
| [COACH-WATTS-1EC](https://newpush-y4.sentry.io/issues/COACH-WATTS-1EC)                                                                                                                                                                                                                                                                                                                                                                               | Quotas fetch no response                       | Dev noise                                                                                                                               |
| [COACH-WATTS-1EG](https://newpush-y4.sentry.io/issues/COACH-WATTS-1EG)                                                                                                                                                                                                                                                                                                                                                                               | Quotas fetch 401                               | Dev noise                                                                                                                               |
| [COACH-WATTS-3J](https://newpush-y4.sentry.io/issues/COACH-WATTS-3J)                                                                                                                                                                                                                                                                                                                                                                                 | Promise rejection `undefined` on `/activities` | Safe task callbacks + workout page lifecycle guards                                                                                     |
| [COACH-WATTS-15P](https://newpush-y4.sentry.io/issues/COACH-WATTS-15P)                                                                                                                                                                                                                                                                                                                                                                               | `addColorStop` invalid rgba                    | `withOpacity` helper in `ChartRenderer.vue` / `BaseWidget.vue`                                                                          |
| [COACH-WATTS-15E](https://newpush-y4.sentry.io/issues/COACH-WATTS-15E)                                                                                                                                                                                                                                                                                                                                                                               | Prisma `featureFlags` unknown field            | `npx prisma generate`                                                                                                                   |
| [COACH-WATTS-12T](https://newpush-y4.sentry.io/issues/COACH-WATTS-12T)                                                                                                                                                                                                                                                                                                                                                                               | Destructure `bum` from null                    | Unregister `useAnalyticsBus` listeners on unmount                                                                                       |
| [COACH-WATTS-1P](https://newpush-y4.sentry.io/issues/COACH-WATTS-1P)                                                                                                                                                                                                                                                                                                                                                                                 | `parentNode` null                              | Fixed listener leaks in `workout-explorer.vue` / `ChartRenderer.vue`                                                                    |
| [COACH-WATTS-ZT](https://newpush-y4.sentry.io/issues/COACH-WATTS-ZT)                                                                                                                                                                                                                                                                                                                                                                                 | Undefined `.p` in chat                         | Defensive checks in `ChatMessageContent.vue`                                                                                            |
| [COACH-WATTS-7A](https://newpush-y4.sentry.io/issues/COACH-WATTS-7A)                                                                                                                                                                                                                                                                                                                                                                                 | `session is not defined`                       | Use `event.context.session` from `requireAuth`                                                                                          |
| [COACH-WATTS-130](https://newpush-y4.sentry.io/issues/COACH-WATTS-130)                                                                                                                                                                                                                                                                                                                                                                               | `activities.value.filter is not a function`    | `Array.isArray` guard in `activities.vue`                                                                                               |
| [COACH-WATTS-ZH](https://newpush-y4.sentry.io/issues/COACH-WATTS-ZH)                                                                                                                                                                                                                                                                                                                                                                                 | `timezone is not defined`                      | Renamed to `userTimezone` in `trigger/daily-checkin.ts`                                                                                 |
| [COACH-WATTS-10W](https://newpush-y4.sentry.io/issues/COACH-WATTS-10W)                                                                                                                                                                                                                                                                                                                                                                               | `i is not a function` on workout detail        | Guard translation fn in `getWorkoutSourceLabel`                                                                                         |
| [COACH-WATTS-5X](https://newpush-y4.sentry.io/issues/COACH-WATTS-5X)                                                                                                                                                                                                                                                                                                                                                                                 | `WorkoutAnalysisReady` not found               | Import alignment + `recommendationHighlights` guards                                                                                    |
| [COACH-WATTS-Z7](https://newpush-y4.sentry.io/issues/COACH-WATTS-Z7)                                                                                                                                                                                                                                                                                                                                                                                 | `absPower is not defined`                      | Removed by refactor                                                                                                                     |
| [COACH-WATTS-18B](https://newpush-y4.sentry.io/issues/COACH-WATTS-18B)                                                                                                                                                                                                                                                                                                                                                                               | `decoupling.toFixed` on null                   | Null checks in `AdvancedWorkoutMetrics.vue`                                                                                             |

_Batch resolved 2026-07-15: auth/chunk/dev-noise cluster (23, 1AA, 1B9, 1C4, 50, 1E8, 1DF, D, 9, C, 57, 1E9, 1E4, 1DE, 1EB, 1DG, 1DH), fix-committed cluster (66, 1CG, 3J, 1DB–1DD, 1D6, 1D8, 1D9, 1DQ, 1E0–1E3, 1E6, 1DR–1DY, 1DT, 1DV, 1DJ, 1DX, 1DW, 1DK, 16B, YD, 6Z)._

## Local development

Sentry is **off by default** during `pnpm dev` (`sentry.enabled: false` in `nuxt.config.ts`). This keeps HMR, Vite syntax errors, and missing Trigger.dev credentials out of the dashboard.

To test Sentry locally (e.g. `/debug/sentry`):

```bash
SENTRY_ENABLED=true pnpm dev
```

Requires `SENTRY_DSN` in `.env`. Production builds always enable Sentry when `NODE_ENV=production`.

## Maintenance Guidelines

1. **Sync from Sentry** — Ask the agent to refresh unresolved issues from **`newpush-y4` / `coach-watts` only** (never `watt-mind`); update the **Active** table above.
2. **New critical issues** — Add a row to **Active** and, if actionable, a matching `docs/issues/NNN-*.md` entry.
3. **When an issue is handled, close it in Sentry** — This is mandatory, not optional:
   - **Code fix shipped** and quiet for 24–48h → **Resolve** in Sentry with a short comment (commit, doc link, or root cause).
   - **Confirmed noise** (deploy blips, scanner traffic, extension errors) → **Resolve** or **Ignore** in Sentry; add `ignoreErrors` / `beforeSend` filters only when appropriate.
   - **Dev-only / transient HMR** → **Resolve** once source is valid and events have stopped.
   - Then move the row from **Active** or **Fix committed** to **Recently Resolved** in this file.
4. **Agents and developers** — After triaging or fixing a Sentry issue, always update Sentry status in the same session. Do not leave handled issues unresolved in the dashboard.
5. **Noise** — Add `ignoreErrors` patterns in `sentry.client.config.ts` only for confirmed third-party / scanner / chunk-load _message variants_; document in `docs/issues/`. Do not ignore generic minified Vue runtime messages (they can hide real bugs).
6. **Batch plans** — Use `conductor/sentry-issues-resolution-plan.md` for multi-issue sprints; archive when complete.
7. **Chunk loads** — Follow the [Chunk load playbook](#chunk-load-playbook); product mitigation is already shipped. Prefer Sentry Resolve/Ignore over more code unless reload fails in the wild.
