# Systematic App Review — Progress Tracker

**Started:** 2026-07-08  
**Last updated:** 2026-07-08 (session 2)  
**Goal:** Comprehensive bug/UI/security audit across the full Coach Watts codebase. Documentation only — no refactors.

## Summary

| Metric | Value |
| ------ | ----- |
| Structure-generation issues | 001–038 ([issues.md](./issues.md)) |
| App-review issues filed | 039–170 |
| **Total documented issues** | **170** |
| Review phases complete | 4 / 5 |
| **Overall review progress** | **~75%** |

## Methodology

1. Area-by-area pass — pages, components, API routes, triggers, stores per domain
2. Pattern scan — `onTaskFailed` gaps, silent catch, unscoped localStorage, missing auth, webhooks
3. Verify in code — every issue cites real paths and behavior
4. Flat files — `docs/issues/NNN-slug.md` + index in [app-review-issues.md](./app-review-issues.md)
5. Dedup against 001–170 before filing new issues

## Area checklist

| # | Area | Status | Issues | Session |
| - | ---- | ------ | ------ | ------- |
| 1 | Dashboard & Activities | ✅ Done | 039, 042, 134–137 | 1–2 |
| 2 | Settings, Profile, Billing | ✅ Done | 040, 046, 055, 143 | 1–2 |
| 3 | Notifications & System messages | ✅ Done | 052, 053 | 1 |
| 4 | Wellness, Recovery, Fitness | ✅ Done | 044–045, 048, 138–140, 160 | 1–2 |
| 5 | Reports & Recommendations | ✅ Done | 050–051, 148, 150 | 1–2 |
| 6 | Performance & Analytics | ✅ Done | 041, 049, 076, 122 | 1–2 |
| 7 | Workouts (completed) | ✅ Done | 043, 064–065, 073–074, 088–092, 112–113, 130 | 1–2 |
| 8 | Workouts (planned) & Plans | ✅ Done | 080, 089–090, 117–118, 119 | 2 |
| 9 | Chat & AI tools | ✅ Done | 062, 077–079, 123, 163–166 | 1–2 |
| 10 | Nutrition | ✅ Done | 067, 075, 081–084, 114, 156–157 | 2 |
| 11 | Coaching & Teams | ✅ Done | 068, 085, 115–116, 152–154 | 2 |
| 12 | Auth, OAuth, Session | ✅ Done | 058, 071, 093, 109–111, 125–126, 129 | 1–2 |
| 13 | Integrations & Webhooks | ✅ Done | 056, 059–060, 069–072, 099–108, 161 | 1–2 |
| 14 | Share & Public pages | ✅ Done | 066, 094–096, 135–137, 155–160 | 2 |
| 15 | Admin | ✅ Done | 063, 143–144, 167–169 | 2 |
| 16 | Trigger.dev tasks | 🔄 Partial | 060, 105–108, 127–128, 162, 170 | 2 |
| 17 | Composables & Stores | ✅ Done | 054, 145–151 | 2 |
| 18 | Infra, Debug, i18n | 🔄 Partial | 057, 061, 102–104, 144 | 1–2 |
| 19 | Feed & Events | ✅ Done | 131–133, 141–142 | 2 |
| 20 | Onboarding & Join | ✅ Done | 097, 124, 152–154 | 2 |
| 21 | Developer portal | ✅ Done | 141, 158 | 2 |
| 22 | Connect-* pages | ✅ Done | 161 | 2 |
| 23 | Library | ✅ Done | 078, 086–087, 119–121 | 2 |

**Legend:** ✅ Done · 🔄 Partial · ⏳ Pending

## Pattern scan results

| Pattern | Occurrences (issue IDs) |
| ------- | ----------------------- |
| `onTaskCompleted` without `onTaskFailed` | 039, 049–051, 064–065, 073–074, 080–082, 119, 138 |
| Silent error / empty state on API fail | 044, 048, 052, 055, 077, 114, 120, 122, 133, 135, 149, 151, 168 |
| Unscoped localStorage / no logout clear | 041, 136, 145–146 |
| Webhook missing auth | 059, 069–072, 099–101 |
| OAuth security gaps | 058, 071, 093, 110–111, 125–126, 129 |
| Route param change no refetch | 064–065, 141 |
| Share/privacy over-exposure | 066, 094–096, 135–137, 155–160, 157 |
| Stub / non-functional UI | 085–087, 137, 074 |
| Stale store cache after error/switch | 145–151 |

## Phase plan

### Phase 1 — Foundation ✅
- [x] Read issue process, initial review 039–061
- [x] Create `app-review-issues.md`, `REVIEW-PROGRESS.md`

### Phase 2 — Core user flows ✅
- [x] Workouts, nutrition, coaching, chat, plans, library
- [x] Performance, analytics, feed, activities, fitness, events

### Phase 3 — Coaching, admin, public ✅
- [x] Share tokens, join/onboarding, developer portal, admin panel

### Phase 4 — Backend sweep 🔄
- [x] Webhook auth audit (most providers)
- [x] API auth samples (admin, oauth, share, join)
- [ ] Remaining trigger tasks deep pass (ingest-*, analyze-*, messaging)
- [ ] Full `server/api/**` auth grep (automated pass)

### Phase 5 — Polish ⏳
- [ ] Full i18n page audit (061 partial)
- [ ] Accessibility spot checks (beyond 045)
- [ ] Cross-ref SENTRY-ISSUES.md unresolved items
- [ ] Cross-ref TODO_MISSING_FUNCTIONALITY.md

## Session log

| Date | Session | Work | New issues |
| ---- | ------- | ---- | ---------- |
| 2026-07-08 | 1 | Initial broad review | 039–061 |
| 2026-07-08 | 2 | Systematic multi-area review (workouts, nutrition, coaching, auth, share, admin, stores, feed, events, triggers) | 062–170 |

## Next session priorities

1. **Trigger task sweep** — remaining ingest/analyze/messaging tasks for ownership, syncStatus, idempotency
2. **Automated API auth scan** — script to list routes without `requireAuth`/`getServerSession`
3. **i18n audit** — all 150 pages for hardcoded English
4. **Sentry cross-ref** — map COACH-WATTS-* to new issue IDs or confirm fixed

## Related docs

- [app-review-issues.md](./app-review-issues.md) — Master index (039–170)
- [issues.md](./issues.md) — Structure generation (001–038)
- [issue-management.md](../04-guides/issue-management.md)
- [SENTRY-ISSUES.md](../../SENTRY-ISSUES.md)
