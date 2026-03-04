# Translation Inventory & Roadmap

This document tracks the progress of internationalization (i18n) across Coach Watts and provides a granular mapping of components to namespaces.

## Status Legend

- ✅ **Complete**: Fully localized (en/hu) and tested.
- 🏗️ **In Progress**: Localized but may have gaps or missing translations.
- ❌ **Not Started**: Hardcoded strings only.
- 🔌 **Registered**: Namespace exists in `app/plugins/tolgee.ts`.

---

## 1. Core & Shared (Global)

**Namespace:** `common`, `legend`, `onboarding`

| Feature / Component              | Status | Namespace    | Notes                              |
| :------------------------------- | :----: | :----------- | :--------------------------------- |
| Sidebar Navigation               |   ✅   | `common`     | Fully reactive in `default.vue`.   |
| Command Palette                  |   ✅   | `common`     | Search groups localized.           |
| AI Quick Capture                 |   ✅   | `common`     | Floating coach bar.                |
| Banners (Impersonation/Coaching) |   ✅   | `common`     | Sticky admin banners.              |
| Calendar Legend                  |   ✅   | `legend`     | Used in Activities and Dashboard.  |
| New User Onboarding              |   ✅   | `onboarding` | Empty state for /dashboard.        |
| Help Center                      |   ✅   | `common`     | Support resources and ticket flow. |
| Modals (Upgrade/Wellness/Load)   |   🏗️   | `common`     | Shared across multiple pages.      |

---

## 2. Dashboard Page (`/dashboard`)

**Namespace:** `dashboard`

| Component                    | Status | Namespace   | Notes                              |
| :--------------------------- | :----: | :---------- | :--------------------------------- |
| Page Layout & Toasts         |   ✅   | `dashboard` | Header buttons, sync alerts.       |
| Athlete Profile Card         |   ✅   | `dashboard` | Level, XP, Fitness Signature.      |
| Training Recommendation Card |   ✅   | `dashboard` | AI advice and "Accept" flow.       |
| Performance Scores Card      |   ✅   | `dashboard` | Fitness/Recovery/Nutrition scores. |
| Nutrition Fueling Card       |   ✅   | `dashboard` | Glycogen tank and timeline.        |
| Recent Activity Card         |   ✅   | `dashboard` | Activity row items.                |
| Data Sync Status Card        |   ✅   | `dashboard` | Provider status (Garmin/Strava).   |
| System Message Card          |   ✅   | `dashboard` | Admin broadcast messages.          |
| Missing Data Banner          |   ✅   | `dashboard` | Prompt to complete profile.        |

---

## 3. AI Chat System (`/chat`)

**Namespace:** `chat`

| Component                   | Status | Namespace | Notes                               |
| :-------------------------- | :----: | :-------- | :---------------------------------- |
| Chat Page Layout            |   ✅   | `chat`    | Share, Settings, New Chat buttons.  |
| Chat Sidebar                |   ✅   | `chat`    | Room list, search, delete/rename.   |
| Chat Input                  |   ✅   | `chat`    | Placeholder, error states, send.    |
| Message List                |   🏗️   | `chat`    | Role labels, timestamps, editing.   |
| Tool Cards (Workout/Metric) |   ❌   | `chat`    | AI tool invocation UI elements.     |
| Tool Approvals              |   ❌   | `chat`    | Permission requests for AI actions. |
| Legacy Banner               |   ✅   | `chat`    | Read-only warning for old chats.    |

---

## 4. Activities & Workouts

**Namespace:** `activities`, `workout`, `workout-tooltips`

| Page / Component                  | Status | Namespace              | Notes                            |
| :-------------------------------- | :----: | :--------------------- | :------------------------------- |
| Activities Page (`/activities`)   |   ✅   | `activities`, `legend` | Filter controls, column headers. |
| Workout Detail (`/workouts/[id]`) |   ✅   | `workout`              | Deep performance auditing view.  |
| Workout Summary                   |   ✅   | `workout`              | Charts, intervals, performance.  |
| Workout Matcher                   |   ❌   | `workout`              | Planned vs Completed linking.    |
| Workout Upload                    |   ❌   | `workout`              | FIT file processing UI.          |

---

## 5. Nutrition & Fueling

**Namespace:** `nutrition`

| Page / Component               | Status | Namespace   | Notes                           |
| :----------------------------- | :----: | :---------- | :------------------------------ |
| Nutrition Index (`/nutrition`) |   ✅   | `nutrition` | Daily fueling strategy view.    |
| Nutrition History              |   ❌   | `nutrition` | Historical macro logs.          |
| Fueling Timeline               |   ❌   | `nutrition` | PRE/INTRA/POST blocks.          |
| Food Item Modals               |   ❌   | `nutrition` | AI scanning and manual logging. |

---

## 6. Performance & Fitness

**Namespace:** `performance`, `fitness`

| Page / Component          | Status | Namespace     | Notes                             |
| :------------------------ | :----: | :------------ | :-------------------------------- |
| Performance Overview      |   ✅   | `performance` | PMC, FTP evolution, power curve.  |
| Fitness Page (`/fitness`) |   ✅   | `fitness`     | Wellness trends, weight tracking. |
| Wellness Table            |   🏗️   | `fitness`     | Raw biometric data view.          |
| HRV/RHR Trends            |   ✅   | `fitness`     | Dual charts and correlation.      |

---

## 7. Goals & Events

**Namespace:** `goals`, `events`

| Page / Component              | Status | Namespace | Notes                          |
| :---------------------------- | :----: | :-------- | :----------------------------- |
| Goals Page (`/profile/goals`) |   ❌   | `goals`   | Target setting and progress.   |
| Events Page (`/events`)       |   ❌   | `events`  | Race calendar and goal events. |
| Goal Wizard                   |   ❌   | `goals`   | Multi-step setup flow.         |

---

## 8. Settings

**Namespace:** `profile`, `settings`, `auth`

| Feature / Component     | Status | Namespace  | Notes                                   |
| :---------------------- | :----: | :--------- | :-------------------------------------- |
| Basic Settings          |   ✅   | `profile`  | Personal info, units, location.         |
| Sport Settings          |   ✅   | `profile`  | Zones, FTP, LTHR per sport.             |
| Goals & Trophies        |   ✅   | `profile`  | Performance targets and Hall of Fame.   |
| Nutrition Profile       |   ✅   | `profile`  | Metabolic settings and fueling presets. |
| Communication           |   ✅   | `profile`  | Email preferences and timings.          |
| AI Coach Settings       |   ✅   | `settings` | Identity, behavior, and quotas.         |
| Billing & Subscriptions |   ✅   | `settings` | Stripe integration and plans.           |
| Danger Zone             |   ✅   | `settings` | Account deletion and data wiping.       |
| Developer Settings      |   ✅   | `settings` | API keys and docs links.                |

---

## 9. Admin & Developer

**Namespace:** `admin` (Internal Only)

| Area            | Status | Namespace | Notes                            |
| :-------------- | :----: | :-------- | :------------------------------- |
| User Management |   ❌   | `admin`   | Internal use only. **Excluded**. |
| LLM Statistics  |   ❌   | `admin`   | Internal use only. **Excluded**. |
| Debug Tools     |   ❌   | `admin`   | Internal use only. **Excluded**. |
| API Docs        |   ❌   | `admin`   | Internal use only. **Excluded**. |

---

## TODO List (Upcoming Tasks)

### Component Deep Dives

- [ ] Localize `WorkoutMatcher.vue` (Matching logic labels).
- [ ] Localize `FuelingTimeline.vue` (PRE/INTRA/POST window labels).
- [ ] Localize `WorkoutUpload.vue` (File drag-drop and progress).
- [ ] Localize `GoalWizard.vue` (Step-by-step setup).

### Shared Components

- [ ] Audit `UiDataAttribution.vue` for hover titles.
- [ ] Audit `TrendIndicator.vue` for hidden accessibility text.

### Maintenance

- [ ] Fix `TOLGEE_API_KEY` to allow platform sync.
- [ ] Ensure all date formatting uses `useFormat` with localized PPP/PPP patterns.
