# Mobile Companion App — Baseline Spec

Status: Draft (living document)  
Owner: Product + Engineering  
Last Updated: 2026-07-14

## 1. Purpose

Define the product and technical baseline for a native iOS / Android **companion app** for Coach Watts.

This document is the source of truth for:

- product positioning (companion vs full mobile port)
- recommended technology stack
- v1 scope and explicit non-goals
- information architecture and UI structure
- backend/API prerequisites
- phased delivery order

It should be updated as implementation decisions land. It does **not** replace feature specs for recommendations, chat, wellness, or OAuth — those remain in their own docs.

### Related reading

| Topic | Doc |
| --- | --- |
| Activity recommendations | [Activity Recommendations](../02-features/recommendations/activity-recommendations.md) |
| AI chat | [Chat Overview](../02-features/chat/overview.md) |
| OAuth IdP (internal) | [OAuth Provider](../02-features/oauth-provider.md) |
| Developer auth (PKCE) | [Authentication](../developer/authentication.md) |
| Scopes | [Scopes](../developer/scopes.md) |
| Notifications / realtime | [Realtime Message Bus](../01-architecture/realtime-message-bus.md) |
| Web mobile UX review | [Mobile Review Report](./mobile_review_report.md) |

---

## 2. Product positioning

**Coach Watts web** remains the control room: planning, analytics, integrations, coaching teams, nutrition depth, library editing, billing, admin.

**The mobile app** is a field companion. It answers:

> What should I do today, and can I check in / ask the coach without opening the full web app?

### Design constraint

If a screen exists mainly to configure, explore, or architect training, it belongs on web. Mobile ships the daily athlete loop only.

---

## 3. Recommended stack

Prefer one shared TypeScript client over separate Swift/Kotlin apps, so the Coach Watts team stays in one language ecosystem.

| Layer | Choice | Notes |
| --- | --- | --- |
| Runtime | **Expo (React Native) + TypeScript** | Use a **dev client** when native modules are required (HealthKit, etc.) |
| Navigation | **Expo Router** | File-based routes; mirrors Nuxt mental model |
| UI | React Native + **NativeWind** (or existing design tokens adapted) | Native feel; avoid rebuilding the entire Nuxt UI system |
| Server state | **TanStack Query** | Cache today / recs; stale-while-revalidate; offline retry |
| Auth storage | **expo-secure-store** | Access + refresh tokens only on device |
| Local cache | MMKV and/or SQLite | Offline “today’s workout” snapshot |
| Push | **Expo Notifications** → APNs / FCM | Analysis ready, new recommendation, sync finished |
| Observability | **Sentry React Native** | Align with existing Sentry usage |
| Charts (lite) | Victory Native or Skia | Summary only; deep analytics stay on web |
| Health (later) | HealthKit / Health Connect libs | Sleep, RHR, optional workout write-back |

### Alternatives (not recommended for v1)

| Option | When to reconsider |
| --- | --- |
| Flutter | Strong custom UI/charts, but leaves the TypeScript monorepo |
| Kotlin Multiplatform + SwiftUI/Compose | Best true-native UX; higher cost for a small team |
| Capacitor wrapping Nuxt | Acceptable for a PWA experiment; weak for HealthKit, push reliability, offline workout UX |

### Repository layout (target)

```
clients/
  mobile/                 # Expo app (new)
  demo-nuxt/              # existing
```

Keep the Nuxt server as the API host. Do not embed business logic in the mobile client beyond presentation and optimistic UI.

---

## 4. Scope

### 4.1 In scope — v1

Jobs, in priority order:

1. **Today** — planned workout + AI recommendation (proceed / modify / rest), accept/skip, short rationale
2. **Check-in / Log** — sleep, readiness/feel, free-text notes (weight if already part of wellness flows)
3. **Session detail** — today’s planned structure (intervals summary); link out to web for deep analysis
4. **Recent activity** — last few workouts with status (synced / analysis ready), not the full calendar explorer
5. **Coach chat** — short Q&A seeded with today’s plan + recovery context
6. **Notifications** — push + in-app inbox for analysis ready, new recommendation, sync finished
7. **Account glue** — instance URL (self-hosted), sign-in, notification prefs, “Open on web”

### 4.2 Explicit non-goals — v1

Do **not** ship native equivalents of:

- Plan architect / training plan builder
- Analytics builder, performance curves, workout explorer/comparison
- Multi-athlete coaching / teams
- Integration OAuth connect flows (Strava, Whoop, etc.)
- Nutrition planning / grocery lists
- Workout library editing
- Billing, admin, developer portal

Use a single **Open in browser** escape hatch instead of half-porting these surfaces.

### 4.3 Later (v1.5+)

- HealthKit / Health Connect ingest (sleep, RHR)
- Structured workout push to Garmin / Wahoo / Intervals.icu
- Offline-first “today’s workout” when connectivity is poor
- Weekly glance (load / form summary — not full CTL charts)
- Optional nutrition quick-log (macros only)

---

## 5. Information architecture

### 5.1 Primary navigation

Bottom tabs — **four maximum**:

| Tab | Route (suggested) | Role |
| --- | --- | --- |
| **Today** | `/(tabs)/today` | Home. One scroll, one decision. |
| **Log** | `/(tabs)/log` | Check-in + wellness. Input-first. |
| **Coach** | `/(tabs)/coach` | Chat (+ optional recent recommendation context). |
| **More** | `/(tabs)/more` | Activities, notifications, settings, open web. |

Unread badge belongs on **More** (or a bell in the Today header) — not a fifth tab.

### 5.2 Push / stack screens (not tabs)

| Screen | Purpose |
| --- | --- |
| Recommendation detail | Full reasoning + modifications |
| Planned workout detail | Intervals / zones / duration |
| Activity summary | Lightweight completed-session view |
| Notification detail / list | Inbox when opened from More or push |
| Sign-in / instance setup | First launch and re-auth |
| Settings | Notification prefs, account, open web, sign out |

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
- Notifications
- Preferences
- Help / Open web app
- Sign out

---

## 6. Interaction principles

1. **Morning path &lt; 30 seconds** — open → see recommendation → accept or rest.
2. **Thumb-first CTAs** — primary actions near the bottom of Today.
3. **Read vs write split** — Today/Coach decide; Log writes.
4. **Push deep-links** — land on Today or the relevant detail; never a dead inbox.
5. **Honest empty/loading states** — e.g. “Waiting for Whoop / Intervals sync…” instead of blank cards.
6. **Self-hosted first-class** — collect instance base URL + login on first launch.
7. **Web escape hatch** — every deep feature deep-links to the authenticated web surface when out of scope.
8. **Do not clone the web dashboard** — mobile is not a responsive port of `/dashboard`.

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

### Suggested scopes (v1)

| Scope | Why |
| --- | --- |
| `profile:read` | Name, basics, FTP display |
| `workout:read` | Recent activities + planned workout surface |
| `health:read` | Recovery strip |
| `health:write` | Check-in / wellness log |
| `recommendations:read` | Today’s recommendation |
| `recommendations:write` | Accept / dismiss |
| `planning:read` | Today’s planned workout |
| `offline_access` | Refresh tokens |
| Chat access | Use existing chat APIs under an agreed scope or first-party session bridge — **decide before impl** (see Open Questions) |

Public docs today: [developer/authentication.md](../developer/authentication.md), [developer/scopes.md](../developer/scopes.md).

### Self-hosted

Onboarding must accept a custom API base URL (e.g. `https://coach.example.com`). Validate reachability and TLS before starting OAuth.

---

## 8. API surface (companion contract)

Prefer a thin **companion-oriented** BFF or curated existing endpoints. Do not force the mobile client to fan out across a dozen web-only aggregate calls on cold start.

### 8.1 Must-have endpoints (logical)

| Capability | Suggested contract | Notes |
| --- | --- | --- |
| Bootstrap / home | `GET /api/mobile/today` (new) **or** compose dashboard + today-recommendation | Single payload: recommendation, planned workout, recovery strip, unread count |
| Recommendation actions | existing accept / dismiss recommendation APIs | Map to `recommendations:write` |
| Wellness check-in | existing wellness POST/PATCH | Map to `health:write` |
| Recent activities | workouts list (limited, recent) | Cap page size for mobile |
| Chat | existing chat room / messages / stream APIs | Confirm mobile auth + streaming strategy |
| Notifications list + read | existing `/api/notifications` | |
| Push device register | `POST /api/mobile/devices` (new) | Store Expo push token + platform + user |
| Push preferences | reuse / extend communication prefs | Align with email notification taxonomy where sensible |

### 8.2 Backend prerequisites before UI polish

1. Mobile-friendly auth (Bearer / refresh) end-to-end verified from a native client.
2. Stable “today” aggregate (or documented composition of existing endpoints).
3. Device registration + push send path (Trigger.dev / BullMQ hooks when analysis or recommendation completes).
4. Deep-link URL scheme / universal links for Today, recommendation, activity, chat.

### 8.3 Push event types (initial)

| Event | Deep-link target |
| --- | --- |
| `RECOMMENDATION_READY` | Today / recommendation detail |
| `WORKOUT_ANALYSIS_READY` | Activity summary |
| `SYNC_COMPLETED` | Today (refresh) |
| `COACH_MESSAGE` (if applicable) | Coach tab |

Reuse the existing notification taxonomy where possible; extend rather than invent a parallel system.

---

## 9. Screen → data mapping

| Screen | Primary data | Mutations |
| --- | --- | --- |
| Today | today aggregate | accept / modify / rest recommendation |
| Recommendation detail | recommendation by id | same actions |
| Planned workout detail | planned workout by id | none in v1 (export later) |
| Log | none (form) | create/update wellness |
| Coach | chat room + messages | send message |
| Recent activities | workouts page | none |
| Activity summary | workout by id | none |
| Notifications | notifications page | mark read / mark all |
| Settings | profile + prefs | update push prefs; sign out |

---

## 10. Non-functional requirements

| Area | Baseline |
| --- | --- |
| Platforms | iOS + Android via Expo |
| Offline | Read last cached Today; queue wellness check-in when offline (v1 soft; harden in v1.5) |
| Perf | Today usable interaction target &lt; 2s on warm cache; show skeleton immediately |
| i18n | Reuse Tolgee keys / same locales as web where practical |
| Accessibility | Dynamic type, VoiceOver/TalkBack labels on primary CTAs |
| Privacy | Health data only with granted scopes; no health metrics in analytics events |
| Branding | Follow [BRANDING.md](../../BRANDING.md); companion is Coach Watts, not a generic fitness shell |
| Observability | Sentry + minimal product analytics events (open Today, accept rec, check-in saved) |

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

| Layer | Expectation |
| --- | --- |
| Unit | Token refresh, today payload mappers, recommendation action state machine |
| Integration | OAuth PKCE against local / staging IdP; wellness write; recommendation accept |
| E2E (Detox or Maestro) | Login → Today → Accept; Login → Log → Save; Push deep-link → Activity |
| Manual device | Self-hosted instance URL; airplane-mode check-in queue; notification permission denial UX |

---

## 13. Open questions

Resolve before or during Phase 0–1:

1. **First-party vs developer OAuth app** — Is the official companion a hard-coded first-party client, or registered like third-party apps?
2. **Chat authorization** — Which scope (or first-party exemption) covers mobile chat send/stream?
3. **Modify recommendation UX** — Inline choices on Today vs dedicated detail screen?
4. **Hosted vs self-hosted distribution** — Single App Store binary with instance picker, or separate branded builds?
5. **Streaming chat** — SSE / WebSocket / polling parity with web under mobile networks?
6. **Companion aggregate API** — New `/api/mobile/*` namespace vs documenting a composition of existing endpoints?

Decisions should be recorded here when made.

---

## 14. Decision log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-07-14 | Companion, not full port | Protect focus on daily athlete loop; web keeps depth |
| 2026-07-14 | Expo + TypeScript | Align with existing Nuxt/TS team skills; OTA-friendly |
| 2026-07-14 | Four-tab IA: Today / Log / Coach / More | One job per tab; avoid dashboard clone |
| 2026-07-14 | OAuth PKCE + Bearer tokens | Existing IdP; cookie sessions are web-only |

---

## 15. Implementation checklist (living)

- [ ] Create `clients/mobile` Expo scaffold
- [ ] Register OAuth client + redirect URIs (dev/prod)
- [ ] Decide and document chat auth approach
- [ ] Ship `GET` today aggregate (or composition guide)
- [ ] Ship device registration + push send hooks
- [ ] Implement Phase 0–1 screens
- [ ] Wire deep links
- [ ] i18n + Sentry
- [ ] Store listing / privacy nutrition labels
- [ ] Update this doc as decisions land
