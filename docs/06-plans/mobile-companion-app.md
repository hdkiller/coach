# Mobile Activation Companion — Baseline Spec

Status: Draft (living document)  
Owner: Product + Engineering  
Last Updated: 2026-07-24

## 1. Purpose

Define the product and technical baseline for a native iOS / Android **activation companion** for Coach Watts.

This document is the source of truth for:

- product positioning (activation companion vs full mobile port)
- recommended technology stack
- shipped daily loop + activation onboarding chapter + explicit non-goals
- information architecture and UI structure
- backend/API prerequisites
- phased delivery order

It should be updated as implementation decisions land. It does **not** replace feature specs for recommendations, chat, wellness, goals, plans, or OAuth — those remain in their own docs.

**Implementation checklist** for the Expo app lives in the `watts-mobile` repo (`docs/product-baseline.md`, `docs/implementation-plan.md`). Keep this file as the product/API narrative; sync positioning when either side changes.

### Related reading

| Topic                    | Doc                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Activity recommendations | [Activity Recommendations](../02-features/recommendations/activity-recommendations.md) |
| AI chat                  | [Chat Overview](../02-features/chat/overview.md)                                       |
| OAuth IdP (internal)     | [OAuth Provider](../02-features/oauth-provider.md)                                     |
| Developer auth (PKCE)    | [Authentication](../developer/authentication.md)                                       |
| Scopes                   | [Scopes](../developer/scopes.md)                                                       |
| Notifications / realtime | [Realtime Message Bus](../01-architecture/realtime-message-bus.md)                     |
| Web mobile UX review     | [Mobile Review Report](./mobile_review_report.md)                                      |
| New-user conversion      | [Onboarding conversion plan](./new-user-onboarding-conversion-plan.md)                 |
| watts-mobile baseline    | `watts-mobile` repo `docs/product-baseline.md` (implementation mirror)                 |

---

## 2. Product positioning

**Coach Watts web** remains the control room for **leftovers**: plan templates / save-as-template / public share, Intervals.icu publish, analytics/explorer, coaching teams, library editing, billing administration, admin.

**The mobile app** is an **activation companion + Plan companion**. It answers:

1. Day one: Can I become a coached athlete without opening the web app?
2. Every morning after: What should I do today, and can I check in / ask the coach on my phone?
3. When life blows up: Can I regenerate, adapt, or replan — and see my nutrition plan — without opening web?

Accounts may be created and activated entirely on device. Web is not a required setup step for day-to-day plan life.

### Design constraints

1. **Activate, then accompany** — goal + plan + insight on device; then the daily loop **plus** Plan tab.
2. **Plan owns plan life** — create / generate / adapt / replan / abandon and nutrition weekly plan live on the Plan tab (thumb-first patterns). Templates, share links, and Intervals publish stay on web.
3. **Connect last, clean** — data is required for _full_ activation but sits late in the wizard and is skippable. Prefer Health Sync over OAuth apps (Strava login confusion must not block the door).
4. **Shared server truth** — `onboarding-status` (extended for goal/plan) is the source of truth for both web and mobile.
5. **Do not clone `/dashboard`** onto Today — Plan is the season/week surface.

### Activation model

**Fully activated** = `data → goal → plan → insight` (all four).

**Soft-activated** = goal + plan + first insight (may enter companion tabs; Finish-setup until data).

**Wizard UX order** (friction-aware, not the same as dependency order):

```
consent → goal lite → plan generator → first insight → connect data (last; Skip OK)
```

Activation plan step reuses the same Plan generator module as the standing Plan tab.

See also [new-user onboarding conversion plan](./new-user-onboarding-conversion-plan.md) — definitions should converge so web and mobile share soft vs full activation.

---

## 3. Recommended stack

Prefer one shared TypeScript client over separate Swift/Kotlin apps, so the Coach Watts team stays in one language ecosystem.

| Layer          | Choice                                                            | Notes                                                                   |
| -------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Runtime        | **Expo (React Native) + TypeScript**                              | Use a **dev client** when native modules are required (HealthKit, etc.) |
| Navigation     | **Expo Router**                                                   | File-based routes; mirrors Nuxt mental model                            |
| UI             | React Native + **NativeWind** (or existing design tokens adapted) | Native feel; avoid rebuilding the entire Nuxt UI system                 |
| Server state   | **TanStack Query**                                                | Cache today / recs; stale-while-revalidate; offline retry               |
| Auth storage   | **expo-secure-store**                                             | Access + refresh tokens only on device                                  |
| Local cache    | MMKV and/or SQLite                                                | Offline “today’s workout” snapshot                                      |
| Push           | **Expo Notifications** → APNs / FCM                               | Analysis ready, new recommendation, sync finished                       |
| Observability  | **Sentry React Native**                                           | Align with existing Sentry usage                                        |
| Charts (lite)  | Victory Native or Skia                                            | Summary only; deep analytics stay on web                                |
| Health (later) | HealthKit / Health Connect libs                                   | Sleep, RHR, optional workout write-back                                 |

### Alternatives (not recommended for v1)

| Option                                 | When to reconsider                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| Flutter                                | Strong custom UI/charts, but leaves the TypeScript monorepo                               |
| Kotlin Multiplatform + SwiftUI/Compose | Best true-native UX; higher cost for a small team                                         |
| Capacitor wrapping Nuxt                | Acceptable for a PWA experiment; weak for HealthKit, push reliability, offline workout UX |

### Repository layout (target)

```
clients/
  mobile/                 # Expo app (new)
  demo-nuxt/              # existing
```

Keep the Nuxt server as the API host. Do not embed business logic in the mobile client beyond presentation and optimistic UI.

---

## 4. Scope

### 4.1 Shipped companion loop (store-candidate base)

Daily athlete loop (implemented in `watts-mobile`; detail there):

1. **Today** — recommendation + planned hero, Analyze Readiness, Daily Coach Check-In, wellness/load/progress glances, Accept / Discuss
2. **Log** — wellness + recovery events + nutrition quick-log
3. **Session detail** — planned complete/skip; activity AI + charts + lite map
4. **Recent + Upcoming** — More lists (not calendar heatmaps)
5. **Coach chat** — seeded Q&A, sessions, media, tool feedback lite
6. **Notifications** — push + inbox
7. **Account glue** — instance URL, sign-in, Settings hub (includes Nutrition settings), Open web session handoff
8. **Athlete metrics** + Health Sync foundations

### 4.2 Next — Activation onboarding

Mobile-first path (accounts that never touch web):

1. Sign-**up** + native **consent** (terms + health/biometric)
2. **Goal lite** — primary goal capture; optional AI suggest
3. **Plan generator** — availability → generate → preview → activate (same module as Plan tab; not a desktop PlanDashboard clone)
4. **First insight** — week reveal and/or today’s recommendation
5. **Connect data last** — Health Sync primary; Connected Apps lite secondary; Skip → soft-activated + Finish-setup card
6. Server-driven resume via extended `onboarding-status`

Fully activated = data → goal → plan → insight. Soft-activated may use the companion before data lands.

### 4.2b Next — Plan companion tab (`watts-mobile` OpenSpec train)

| Change                       | Focus                                                       |
| ---------------------------- | ----------------------------------------------------------- |
| `plan-tab-shell`             | 5th tab Plan; Training \| Nutrition; active-plan read shell |
| `plan-generator-full`        | Full generator pipeline + job UX; activation reuses module  |
| `plan-adapt-replan`          | Adapt / replan / abandon / start new                        |
| `plan-structure-edit`        | Week tune, reschedule/move, block CRUD (mobile patterns)    |
| `nutrition-plan-on-plan-tab` | Weekly meal plan, generate, meal actions, grocery           |

Upcoming planned list on More stays **separate** from Plan for now.

### 4.3 Explicit non-goals

Do **not** ship native equivalents of:

- Plan **templates** / save-as-template / public plan **share** / catalog
- **Publish** planned workouts to Intervals.icu (device push later)
- Analytics builder, performance explorer, workout comparison, Today calendar heatmaps
- Multi-athlete coaching / teams
- Workout library editing
- Billing administration, admin, developer portal
- Full Profile Settings / sport zone editors — **except** Nutrition settings (Profile → Nutrition parity) and Sports thresholds lite

**In scope (2026-07-24):** Plan tab training generator + adapt/replan + structure edit; Plan tab nutrition weekly plan / generate / meal actions / grocery; activation reuses Plan generator.

### 4.4 Later

- Structured workout push to Garmin / Wahoo / Intervals.icu
- Stronger offline-first Today
- Optional plan/week-ready push when generator jobs complete

---

## 5. Information architecture

### 5.1 Primary navigation

Bottom tabs — **five**:

| Tab       | Route (suggested) | Role                                             |
| --------- | ----------------- | ------------------------------------------------ |
| **Today** | `/(tabs)/today`   | Home. One scroll, one decision.                  |
| **Plan**  | `/(tabs)/plan`    | Season/week training + nutrition plan.           |
| **Log**   | `/(tabs)/log`     | Check-in + wellness. Input-first.                |
| **Coach** | `/(tabs)/coach`   | Chat (+ optional recent recommendation context). |
| **More**  | `/(tabs)/more`    | Activities, Upcoming, notifications, settings.   |

Unread badge belongs on **More** (or a bell in the Today header).

### 5.2 Push / stack screens (not tabs)

| Screen                       | Purpose                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| Activation wizard            | Consent → goal → plan generator → insight → connect         |
| Goal lite / Goals hub        | Activation + More → Goals list/detail/**create**            |
| Events hub                   | Upcoming Events list/detail/**create** (edit/delete on web) |
| Plan tab / generator         | Training \| Nutrition; create → generate → adapt → replan   |
| Recommendation detail        | Full reasoning + modifications                              |
| Planned workout detail       | Intervals / zones / duration                                |
| Activity summary             | Lightweight completed-session view                          |
| Notification detail / list   | Inbox when opened from More or push                         |
| Sign-up / sign-in / instance | First launch, new accounts, re-auth                         |
| Settings                     | Push, Health Sync, Connected Apps lite, open web            |

### 5.3 Today screen composition (top → bottom)

1. Date + short athlete greeting (secondary typography)
2. **Hero: today’s recommendation** — action, confidence, 1–2 line reason
3. Planned workout block — title, duration, intensity/TSS, expand intervals
4. Recovery strip — sleep / HRV / feel (compact; not a dashboard widget wall)
5. Primary CTAs — **Accept · Modify · Rest/Skip**
6. Optional — “Ask coach about today”

**First viewport rule:** one decision surface. No CTL/ATL grids, calendar heatmaps, or competing card stacks.

### 5.4 Log screen

Form-first:

- Feel / readiness
- Sleep quality + duration
- Optional notes (and weight if applicable)
- Save → return to Today with confirmation

### 5.5 Coach screen

Threaded chat. Seed server/context with:

- today’s planned workout
- today’s recommendation (if any)
- latest recovery / wellness snapshot

Prefer starter prompts over an empty composer.

### 5.6 More screen

Simple list rows:

- Recent activities
- Upcoming planned
- **Goals** (list + detail + lite create; edit/delete/AI on web)
- **Events** (Upcoming Events list + detail + lite create; edit/delete on web)
- Notifications
- Preferences / Settings
- Help / Open web app
- Sign out

---

## 6. Interaction principles

1. **Morning path &lt; 30 seconds once activated** — open → see recommendation → accept or rest.
2. **Thumb-first CTAs** — primary actions near the bottom of Today.
3. **Read vs write split** — Today/Coach decide; Log writes.
4. **Push deep-links** — land on Today or the relevant detail; never a dead inbox.
5. **Honest empty/loading states** — e.g. “Waiting for Whoop / Intervals sync…”; provisional plan copy before data.
6. **Self-hosted first-class** — collect instance base URL + login on first launch.
7. **Web escape hatch** — every deep feature deep-links to the authenticated web surface when out of scope.
8. **Do not clone the web dashboard** — mobile is not a responsive port of `/dashboard`.
9. **Wizard resumable** — kill app mid-activation → return to current server step.
10. **Connect never blocks soft activation** — Skip is first-class.

---

## 7. Auth & security baseline

Coach Watts already exposes OAuth 2.0 + PKCE as an identity provider. The companion app **must** use that path (Bearer tokens), not browser cookie sessions alone.

### Required flow

1. Register a first-party OAuth app for the official companion (or use the developer portal pattern for community clients).
2. Authorization Code + **PKCE (S256)** via system browser / `expo-auth-session`.
3. Store `access_token` + `refresh_token` in Secure Store.
4. Include `offline_access` (and least-privilege scopes below).
5. Refresh on 401; force re-auth when refresh fails.
6. Always persist the latest refresh token (rotation may be enforced later).

### Suggested scopes (activation companion)

Use **REST** OAuth scope names from `REST_OAUTH_SCOPES` (e.g. `recommendation:read`, `plan:read`, `goal:read` — not MCP `recommendations:*` / `planning:*`).

| Scope                                          | Why                                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `profile:read` / `profile:write`               | Name, basics, athlete metrics                                                            |
| `workout:read` / `workout:write`               | Recent/planned; analyze; complete/skip                                                   |
| `health:read` / `health:write`                 | Recovery, check-in                                                                       |
| `recommendation:read` / `recommendation:write` | Today + accept/dismiss / generate                                                        |
| `plan:read` / `plan:write`                     | Active plan + initialize/activate/generate/adapt/replan/structure                        |
| `goal:read` / `goal:write`                     | Events list/detail + event lite create + goal lite (activation + hub create) + Goals hub |
| `nutrition:read` / `nutrition:write`           | Quick-log + Profile nutrition settings + nutrition plan / grocery                        |
| `chat:read` / `chat:write`                     | Coach tab                                                                                |
| `offline_access`                               | Refresh tokens                                                                           |

Public docs today: [developer/authentication.md](../developer/authentication.md), [developer/scopes.md](../developer/scopes.md).

### Self-hosted

Onboarding must accept a custom API base URL (e.g. `https://coach.example.com`). Validate reachability and TLS before starting OAuth.

---

## 8. API surface (companion contract)

Prefer a thin **companion-oriented** BFF or curated existing endpoints. Do not force the mobile client to fan out across a dozen web-only aggregate calls on cold start.

### 8.1 Must-have endpoints (logical)

| Capability                | Suggested contract                                                            | Notes                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Bootstrap / home          | `GET /api/mobile/today` (new) **or** compose dashboard + today-recommendation | Single payload: recommendation, planned workout, recovery strip, unread count                                   |
| Onboarding / consent      | `GET /api/user/onboarding-status` + consent write (Bearer)                    | Extend steps for goal/plan; shared soft vs full activation with web                                             |
| Goal lite                 | `GET/POST/PATCH /api/goals` (+ optional suggest/review)                       | Activation + hub lite create; edit/delete/AI stay web; `goal:read` / `goal:write`                               |
| Upcoming events           | `GET /api/events`, `GET /api/events/:id`, Bearer `POST /api/events`           | Lite create on mobile; edit/delete web; write scope prefer `goal:write`                                         |
| Plan companion            | `plans/initialize` + activate + generate-block/ai-week + adapt + structure    | Plan tab owns lifecycle; templates/share/Intervals publish stay web                                             |
| Nutrition plan            | `nutrition/plan` + generate + meal actions + grocery (Bearer)                 | Plan tab Nutrition segment                                                                                      |
| Recommendation actions    | existing accept / dismiss / today generate                                    | REST `recommendation:write`                                                                                     |
| Wellness check-in         | existing wellness POST/PATCH                                                  | Map to `health:write`                                                                                           |
| Recent activities         | workouts list (limited, recent)                                               | Cap page size for mobile                                                                                        |
| Chat                      | existing chat room / messages + WebSocket                                     | Bearer on chat REST + `GET /api/websocket-token`; poll is fallback only                                         |
| Notifications list + read | existing `/api/notifications`                                                 | `GET` list (`profile:read`); `PATCH /api/notifications/read` (`profile:write`) with `{ id }` or `{ all: true }` |
| Push device register      | `POST /api/mobile/devices` (`profile:write`)                                  | Body: `{ token, platform: 'ios'\|'android', appVersion?, preferences? }` — upsert by token                      |
| Push device unregister    | `DELETE /api/mobile/devices` (`profile:write`)                                | Body: `{ token }` — remove for current user (sign-out)                                                          |
| Push preferences          | `GET/PUT /api/mobile/devices/preferences`                                     | Keys = `ExpoPushEventType`; stored in `MobilePushPreference` (independent of email prefs)                       |

#### `POST /api/mobile/devices` contract

```json
// request
{ "token": "ExponentPushToken[…]", "platform": "ios", "appVersion": "0.1.0", "preferences": { "RECOMMENDATION_READY": true } }

// 200 response
{ "id": "…", "token": "…", "platform": "ios", "appVersion": "0.1.0", "updatedAt": "…" }
```

Idempotent upsert on `token`. Ownership moves to the current user if the token was previously registered to someone else. Optional `preferences` updates the same store as GET/PUT below. Send Expo pushes via `server/utils/expo-push.ts` (`sendExpoPushToUser`) with `data.type` from §8.3 and optional `data.path` — send honors server prefs.

#### `GET/PUT /api/mobile/devices/preferences` contract

```json
// GET 200 / PUT 200 response (and PUT body.preferences)
{
  "RECOMMENDATION_READY": true,
  "WORKOUT_ANALYSIS_READY": true,
  "SYNC_COMPLETED": false,
  "COACH_MESSAGE": true
}
```

`GET` requires `profile:read`; `PUT` requires `profile:write`. PUT body may be `{ "preferences": { … } }` (mobile client) or a flat object. New users default `SYNC_COMPLETED` to **false** (policy-off). Inbox / Expo deep links use mobile-safe paths (`/today`, `/activities/:id`); web maps them via `inbox-link-compat` middleware.

### 8.2 Backend prerequisites before UI polish

1. Mobile-friendly auth (Bearer / refresh) end-to-end verified from a native client.
2. Stable “today” aggregate (or documented composition of existing endpoints).
3. Device registration + push send path (Trigger.dev / BullMQ hooks when analysis or recommendation completes).
4. Deep-link URL scheme / universal links for Today, recommendation, activity, chat.

### 8.3 Push event types (initial)

| Event                           | Deep-link target                            |
| ------------------------------- | ------------------------------------------- |
| `RECOMMENDATION_READY`          | Today / recommendation detail               |
| `WORKOUT_ANALYSIS_READY`        | Activity summary                            |
| `SYNC_COMPLETED`                | Today (refresh) — **policy-off by default** |
| `COACH_MESSAGE` (if applicable) | Coach tab                                   |

**Living taxonomy (channels, prefs bridges, ship gates):**  
`~/Develop/watts-marketing/knowledge/push/inventory.md`  
Coordinate with email catalog: `~/Develop/watts-marketing/knowledge/email/inventory.md`.  
Engineering backlog: `docs/issues/app-review-issues.md` § **364–368**.

Reuse the existing notification taxonomy where possible; extend rather than invent a parallel system. Do not enable a new Expo sender until the inventory row has channel mix, prefs, and a mobile-safe deep link.

---

## 9. Screen → data mapping

| Screen                 | Primary data          | Mutations                             |
| ---------------------- | --------------------- | ------------------------------------- |
| Today                  | today aggregate       | accept / modify / rest recommendation |
| Recommendation detail  | recommendation by id  | same actions                          |
| Planned workout detail | planned workout by id | none in v1 (export later)             |
| Log                    | none (form)           | create/update wellness                |
| Coach                  | chat room + messages  | send message                          |
| Recent activities      | workouts page         | none                                  |
| Activity summary       | workout by id         | none                                  |
| Notifications          | notifications page    | mark read / mark all                  |
| Settings               | profile + prefs       | update push prefs; sign out           |

---

## 10. Non-functional requirements

| Area          | Baseline                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Platforms     | iOS + Android via Expo                                                                         |
| Offline       | Read last cached Today; queue wellness check-in when offline (v1 soft; harden in v1.5)         |
| Perf          | Today usable interaction target &lt; 2s on warm cache; show skeleton immediately               |
| i18n          | Reuse Tolgee keys / same locales as web where practical                                        |
| Accessibility | Dynamic type, VoiceOver/TalkBack labels on primary CTAs                                        |
| Privacy       | Health data only with granted scopes; no health metrics in analytics events                    |
| Branding      | Follow [BRANDING.md](../../BRANDING.md); companion is Coach Watts, not a generic fitness shell |
| Observability | Sentry + minimal product analytics events (open Today, accept rec, check-in saved)             |

---

## 11. Delivery phases

### Phase 0 — Platform & auth

- Scaffold `clients/mobile` Expo app
- Instance URL + OAuth PKCE login
- Secure token storage + refresh
- “Open web” + sign out

### Phase 1 — Today loop

- Today screen against aggregate API
- Recommendation actions
- Planned workout detail
- Basic empty/error/loading states

### Phase 2 — Log + notifications

- Wellness check-in
- In-app notification inbox
- Push device registration + first event types

### Phase 3 — Coach + polish

- Chat tab with context seeding
- Deep links from push
- i18n, Sentry, store prep (icons, privacy strings)

### Phase 4 — v1.5 extensions

- Health platform ingest
- Workout device export
- Stronger offline cache

Each phase should ship behind store builds only when the Auth + Today loop is production-safe.

---

## 12. Testing baseline

| Layer                  | Expectation                                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                   | Token refresh, today payload mappers, recommendation action state machine                                                                                                                                |
| Integration            | OAuth PKCE against local / staging IdP; wellness write; recommendation accept                                                                                                                            |
| E2E (Detox or Maestro) | Against shared e2e stack (`:3199`); Bearer via `POST /api/__e2e/token`. Flows: Login → Today → Accept; Login → Log → Save; Push deep-link → Activity. See [e2e-testing.md](../04-guides/e2e-testing.md). |
| Manual device          | Same e2e or self-hosted instance URL; airplane-mode check-in queue; notification permission denial UX                                                                                                    |

---

## 13. Open questions

Resolve before or during Phase 0–1:

1. ~~**First-party vs developer OAuth app**~~ — **Decided:** first-party Official Mobile App (`isOfficial` + `isPublicClient` via `oauth:create-system-app --official --public-client`).
2. ~~**Chat authorization**~~ — **Decided:** REST scopes `chat:read` / `chat:write` (already in `REST_OAUTH_SCOPES`).
3. **Modify recommendation UX** — Inline choices on Today vs dedicated detail screen?
4. **Hosted vs self-hosted distribution** — Single App Store binary with instance picker, or separate branded builds?
5. ~~**Streaming chat**~~ — **Decided (2026-07-19):** WebSocket (same events as web) after `POST /api/chat/messages`; poll is safety net only. No new SSE endpoint.
6. **Companion aggregate API** — New `/api/mobile/*` namespace vs documenting a composition of existing endpoints?

Decisions should be recorded here when made.

### Chat / realtime backend contract (coach-wattz)

- `GET /api/websocket-token` accepts cookie session **or** Bearer; OAuth mints embed granted scopes in the WS token (`null` for session/API key = unrestricted).
- Chat REST used by mobile (`messages`, room state, resume/retry) uses `requireAuth` with `chat:read` / `chat:write`. WS `chat_*` delivery requires `chat:read`; inbound `chat_message` requires `chat:write`.
- Durable-turn architecture unchanged: do not re-bind full LLM streaming to the original POST HTTP response.

---

## 14. Decision log

| Date       | Decision                                     | Rationale                                                                                                                        |
| ---------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-14 | Companion, not full port                     | Protect focus on daily athlete loop; web keeps depth                                                                             |
| 2026-07-14 | Expo + TypeScript                            | Align with existing Nuxt/TS team skills; OTA-friendly                                                                            |
| 2026-07-14 | Four-tab IA: Today / Log / Coach / More      | One job per tab; avoid dashboard clone — **superseded 2026-07-24**                                                               |
| 2026-07-14 | OAuth PKCE + Bearer tokens                   | Existing IdP; cookie sessions are web-only                                                                                       |
| 2026-07-19 | Chat scopes `chat:read` / `chat:write`       | Match existing chat REST guards; Official Mobile App may request them                                                            |
| 2026-07-19 | Chat streaming via WebSocket + poll fallback | Parity with web; Bearer can mint WS token; no SSE                                                                                |
| 2026-07-24 | Five-tab IA + Plan companion                 | Today · Plan · Log · Coach · More; Plan owns generator/adapt/replan + nutrition plan; templates/share/Intervals publish stay web |

---

## 15. Implementation checklist (living)

- [ ] Create `clients/mobile` Expo scaffold
- [ ] Register OAuth client + redirect URIs (dev/prod) — `oauth:create-system-app --name="Official Mobile App" --official --public-client`
- [x] Decide and document chat auth approach (Bearer + `chat:read`/`chat:write` + WS)
- [ ] Ship `GET` today aggregate (or composition guide)
- [ ] Ship device registration + push send hooks
- [ ] Implement Phase 0–1 screens
- [ ] Wire deep links
- [ ] i18n + Sentry
- [ ] Store listing / privacy nutrition labels
- [ ] Update this doc as decisions land
