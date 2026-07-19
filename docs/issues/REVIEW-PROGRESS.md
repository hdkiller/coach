# Systematic App Review — Progress Tracker

**Started:** 2026-07-08  
**Last updated:** 2026-07-19 (coaching invite/relationship UX review filed issues 327–348)

**Goal:** Comprehensive bug/UI/security audit across the full Coach Watts codebase. Documentation only — no refactors.

## Summary

| Metric                                             | Value                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| Structure-generation issues                        | 001–038 ([issues.md](./issues.md)) — **37 / 38 fixed** (only 012 open)  |
| App-review issues filed                            | 039–348                                                                 |
| **Postponed** (auth / third-party / OAuth / Yazio) | **21** — see [Postponed cluster](#postponed-auth--third-party-deferred) |
| **Active (Open)**                                  | See [app-review-issues.md](./app-review-issues.md) (incl. **327–348** coaching) |
| **Total documented issues**                        | **348** (+ 323 Sentry noise)                                            |
| Review phases complete                             | 5 / 5 (core) + coaching follow-up                                       |
| **Overall review progress**                        | **~96%** (coaching area reopened for deep pass)                         |

## Methodology

1. Area-by-area pass — pages, components, API routes, triggers, stores per domain
2. Pattern scan — `onTaskFailed` gaps, silent catch, unscoped localStorage, missing auth, webhooks
3. Verify in code — every issue cites real file paths and behavior
4. Flat files — `docs/issues/NNN-slug.md` + index in [app-review-issues.md](./app-review-issues.md)
5. Dedup against existing issue files before filing new issues

## Area checklist

| #   | Area                            | Status     | Issues                                                         | Session    |
| --- | ------------------------------- | ---------- | -------------------------------------------------------------- | ---------- |
| 1   | Dashboard & Activities          | ✅ Done    | 039, 042, 134–137, 216                                         | 1–3        |
| 2   | Settings, Profile, Billing      | ✅ Done    | 040, 046, 055, 143, 186–198                                    | 1–3        |
| 3   | Notifications & System messages | ✅ Done    | 052, 053                                                       | 1          |
| 4   | Wellness, Recovery, Fitness     | ✅ Done    | 044–045, 048, 138–140, 160, 175–177                            | 1–3        |
| 5   | Reports & Recommendations       | ✅ Done    | 050–051, 148, 150, 177–180                                     | 1–3        |
| 6   | Performance & Analytics         | ✅ Done    | 041, 049, 076, 122                                             | 1–2        |
| 7   | Workouts (completed)            | ✅ Done    | 043, 064–065, 073–074, 088–092, 112–113, 130                   | 1–2        |
| 8   | Workouts (planned) & Plans      | ✅ Done    | 080, 089–090, 117–118, 119                                     | 2          |
| 9   | Chat & AI tools                 | ✅ Done    | 062, 077–079, 123, 163–166                                     | 1–2        |
| 10  | Nutrition                       | ✅ Done    | 067, 075, 081–084, 114, 156–157, 238–258                       | 2, 13      |
| 11  | Coaching & Teams                | 🔄 Partial | 068, 085, 115–116, 152–154, 201, 263–275, **327–348**          | 2–3, 14, 26 |
| 12  | Auth, OAuth, Session            | ✅ Done    | 058, 071, 093, 109–111, 125–126, 129                           | 1–2        |
| 13  | Integrations & Webhooks         | ✅ Done    | 056, 059–060, 069–072, 099–108, 161, 171–174, 197, **307–322** | 1–3, 23–25 |
| 14  | Share & Public pages            | ✅ Done    | 066, 094–096, 135–137, 155–160                                 | 2          |
| 15  | Admin                           | ✅ Done    | 063, 143–144, 167–169, 207, 211, 215                           | 2–3        |
| 16  | Trigger.dev tasks               | ✅ Done    | 060, 105–108, 127–128, 162, 170, 171–185                       | 2–3        |
| 17  | Composables & Stores            | ✅ Done    | 054, 145–151, 193                                              | 2–3        |
| 18  | Infra, Debug, i18n              | ✅ Done    | 057, 061, 102–104, 144, 196, 199–207                           | 1–3        |
| 19  | Feed & Events                   | ✅ Done    | 131–133, 141–142                                               | 2          |
| 20  | Onboarding & Join               | ✅ Done    | 097, 124, 152–154                                              | 2          |
| 21  | Developer portal                | ✅ Done    | 141, 158, 217                                                  | 2–3        |
| 22  | Connect-\* pages                | ✅ Done    | 161, 200                                                       | 2–3        |
| 23  | Library                         | ✅ Done    | 078, 086–087, 119–121                                          | 2          |
| 24  | Accessibility                   | ✅ Done    | 045, 208–215                                                   | 1–3        |
| 25  | Sentry cross-ref                | ✅ Done    | 187, 196, 197                                                  | 3          |
| 26  | Mobile responsive UI            | ✅ Done    | 276–281                                                        | 15         |
| 27  | Mobile responsive UI, batch 2   | ✅ Done    | 282–289                                                        | 16         |
| 28  | Mobile navigation follow-up     | ✅ Done    | 290–291                                                        | 17         |
| 29  | Mobile discovery batch          | ✅ Done    | 292–294                                                        | 18         |
| 30  | Mobile creation and overlays    | ✅ Done    | 295–300                                                        | 19         |
| 31  | Mobile patch validation         | ✅ Done    | 301–303                                                        | 20         |
| 32  | Mobile card-density review      | ✅ Done    | 304–306 (filed + fixed)                                        | 21–22      |
| 33  | Garmin integration review       | ✅ Done    | 307–322 (307–310/174 fixed; 311–322 open)                      | 23–25      |

**Legend:** ✅ Done · 🔄 Partial · ⏳ Pending

## Phase plan

### Phase 1 — Foundation ✅

- [x] Read issue process, initial review 039–061
- [x] Create `app-review-issues.md`, `REVIEW-PROGRESS.md`

### Phase 2 — Core user flows ✅

- [x] Workouts, nutrition, coaching, chat, plans, library
- [x] Performance, analytics, feed, activities, fitness, events

### Phase 3 — Coaching, admin, public ✅

- [x] Share tokens, join/onboarding, developer portal, admin panel

### Phase 4 — Backend sweep ✅

- [x] Webhook auth audit (most providers) — **fixes postponed** pending third-party coordination
- [x] API auth samples (admin, oauth, share, join) — **auth hardening postponed**
- [x] Trigger tasks deep pass (ingest, analyze, generate, messaging)
- [x] Automated API auth grep (with delegated-auth awareness)

### Phase 5 — Polish ✅ (core complete)

- [x] i18n audit — major gaps documented (199–207)
- [x] Accessibility spot checks (208–215)
- [x] Sentry cross-ref (187, 196, 197)
- [x] Profile settings deep dive (186–198)
- [ ] Remaining: exhaustive per-page i18n grep (low priority)
- [ ] Remaining: automated Sentry → issue mapping script

## Session log

| Date       | Session | Work                                                                                                                                                    | New issues   |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-07-08 | 1       | Initial broad review                                                                                                                                    | 039–061      |
| 2026-07-08 | 2       | Multi-area review (workouts, nutrition, coaching, auth, share, admin, stores, feed, events, triggers)                                                   | 062–170      |
| 2026-07-08 | 3       | Triggers deep pass, profile/settings, i18n/a11y, Sentry cross-ref                                                                                       | 171–218      |
| 2026-07-08 | 3c      | Postpone 070 Yazio + 158 OAuth developer; confirm OAuth batch deferred                                                                                  | —            |
| 2026-07-08 | 4       | Fix 057 — requireAdmin on debug API routes + admin middleware on debug pages                                                                            | —            |
| 2026-07-08 | 5       | Fix 062 — declare pollStartedAt ref in ChatPlannedWorkoutCard polling                                                                                   | —            |
| 2026-07-08 | 6       | Fix 187/190/197 — profile tab popper, autodetect thresholds, FAILED integrations UI                                                                     | —            |
| 2026-07-08 | 7       | Fix 064/065/141/186 — refetch on route param change; profile tab URL sync                                                                               | —            |
| 2026-07-09 | 8       | Merge PRs #226–#237 — 67 app-review issues fixed (chat, profile, nav, logout, tasks, share, ingest, onboarding, feed, user flows, quota)                | —            |
| 2026-07-09 | 9       | Sync issue tracker docs — mark structure-gen batch #214–#222 merged (37 issues fixed; 012 partial)                                                      | —            |
| 2026-07-09 | 10      | Fix low-risk open issues — a11y, toasts, export, webhook URL, Sentry filter, send-email timeout, notifications, fitness pagination                      | —            |
| 2026-07-09 | 11      | Fix low-risk batch 2 — help-center card a11y, data page i18n/a11y, daily check-in i18n, admin chart labels, issues index i18n                           | —            |
| 2026-07-09 | 12      | Chat resilience review — send state, room-load races, WebSocket cleanup, stale-turn recovery, direct-send retry                                         | 219–223      |
| 2026-07-13 | 13      | Nutrition system deep review — metabolic sim/chain, fueling plan, hydration, nutrition APIs, trigger tasks, meal-rec UI (fixed 238/239/240/242/243/244) | 238–258      |
| 2026-07-14 | 15      | Live mobile UI audit at 390×844 and 360×800 across eight core authenticated pages                                                                       | 276–281      |
| 2026-07-14 | 16      | Mobile audit continuation: recovery, recommendations, reports, settings/apps, events, feed, and workout details                                         | 282–289      |
| 2026-07-14 | 17      | Mobile navigation follow-up: header pointer collision, sidebar hierarchy, active-route visibility, and fixed footer                                     | 290–291      |
| 2026-07-14 | 18      | Mobile discovery batch: Library, Coaching, Help Center, sidebar search, Profile Settings, and all nested Settings routes                                | 292–294      |
| 2026-07-14 | 19      | Mobile creation and transactional UI: onboarding consent, manual connections, Exercise editor, plan wizard, Plan Architect overlays and cancellation    | 295–300      |
| 2026-07-14 | 20      | Post-implementation mobile validation of navbar titles, sidebar slideover title, and footer accessible labels                                           | 301–303      |
| 2026-07-14 | 21      | High-frequency mobile card-density review: Dashboard, Recovery, Profile surfaces, performance, activities, workouts, nutrition, and plan details        | 304–306      |
| 2026-07-14 | 22      | Fix mobile card density — Athlete Profile divider modules, Profile Settings single gutter, Recovery flat context/filters                                | 304–306      |
| 2026-07-16 | 23      | Garmin Health/Activity compliance audit — deregister on account delete, Push key aliases, silent-noop throw; leave unused types/permissions/pull open   | 307–311, 174 |
| 2026-07-16 | 24      | Thin 309 (bodyComps/userMetrics pull+backfill) + 310 fail-soft permissions refresh on ingest/callback                                                   | 309–310      |
| 2026-07-16 | 25      | Garmin follow-up: webhook routing/callback security, refresh races, sync status, permissions, backfill, mappings, OAuth ownership, course mapping       | 312–322      |
| 2026-07-19 | 26      | Coaching deep pass: verify 263–274 fixed in code; file invite bugs (327–328), relationship/team gaps, athlete↔coach UX, privacy leak 335               | 327–348      |

## Postponed: auth & third-party (deferred 2026-07-08)

Skipped for now — auth/integration hardening may break ingest or requires provider-side configuration before implementation.

| ID  | Title                                | Why deferred                         |
| --- | ------------------------------------ | ------------------------------------ |
| 058 | OAuth refresh weak binding           | OAuth client breakage                |
| 059 | Withings webhook unauthenticated     | Withings signature setup             |
| 063 | Admin queue API unauthenticated      | Internal auth batch                  |
| 069 | Garmin webhook unauthenticated       | Garmin verification config           |
| 071 | OAuth redirect_uri ignored           | Third-party OAuth apps               |
| 072 | Whoop async webhook bypass           | Whoop endpoint coordination          |
| 094 | Share-generate scope escalation      | OAuth app scope contracts            |
| 098 | Polar webhook missing userId         | Polar payload/worker mapping         |
| 099 | OAuth generic webhook ignores secret | Third-party app webhooks             |
| 100 | Strava POST unauthenticated          | Strava has no signature API          |
| 101 | Wahoo webhook auth optional          | Wahoo dashboard + env key            |
| 102 | Monitoring endpoint public           | Ops MONITORING_SECRET rollout        |
| 105 | Withings webhook no idempotency      | Provider retry behavior              |
| 110 | OAuth login open redirect            | OAuth callback allowlist             |
| 111 | OAuth consent CSRF                   | OAuth flow changes                   |
| 125 | Dangerous email account linking      | Provider login behavior              |
| 126 | OAuth authorize no scope validation  | Registered app scopes                |
| 129 | OAuth revoke no client auth          | Public OAuth clients                 |
| 070 | Yazio password plaintext storage     | Accepted for now; Yazio ingest works |
| 158 | Developer GET leaks webhook secret   | OAuth developer portal batch         |

## Next issue ID: 349

## Remaining optional work (~5%)

1. **012** — Durable generation status model on `PlannedWorkout` (architecture)
2. **327–328** — Critical coaching invite redemption bugs (fix next)
3. Exhaustive i18n grep on all 150 pages (many low-priority gaps remain beyond 199–207)
4. `delete-user-account` trigger cleanup audit
5. Chat attachment URL validation (candidate 224)
6. Map outstanding Sentry issues to fixes after 187/196/197 ship

## Related docs

- [app-review-issues.md](./app-review-issues.md) — Master index (039–348)
- [issues.md](./issues.md) — Structure generation (001–038)
- [issue-management.md](../04-guides/issue-management.md)
- [SENTRY-ISSUES.md](../../SENTRY-ISSUES.md)
