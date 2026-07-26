# Hallmark Audit — Category 2: Core Athlete Workspace

**Audited Routes (7 total)**:
- [`app/pages/dashboard.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/dashboard.vue) (Athlete Dashboard)
- [`app/pages/feed.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/feed.vue) (Activity & Training Feed)
- [`app/pages/chat.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/chat.vue) (AI Endurance Coach Chat)
- [`app/pages/calendar/index.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/calendar/index.vue) (Public Event Calendar)
- [`app/pages/plan.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/plan.vue) (Active Training Plan Dashboard)
- [`app/pages/plans/index.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/plans/index.vue) (Plan Management Hub)
- [`app/pages/notifications.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/notifications.vue) (Notification Center)
- [`app/pages/data.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/data.vue) (Export & Sync Data Center)

**Layout**: `app/layouts/default.vue`

---

## 🛑 Critical Findings (Ships as Slop)

### 1. Dashboard Header Action Clutter
- **Where**: [`app/pages/dashboard.vue:L10-L90`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/dashboard.vue#L10-L90)
- **Tell**: `AI nav` tell variant — navbar contains 6 action buttons (Share, Trigger Monitor, Notification Dropdown, Release Notice, Upload Workout, Sync Data, New Chat). Violates restraint and creates visual clutter at 768px - 1024px tablet viewports.
- **Fix**: Consolidate secondary action icons into a single `UDropdownMenu` overflow menu, keeping only `Sync` and `New Chat` prominent.

### 2. Mobile Parameter Overflow in Chat Tool Cards
- **Where**: [`app/components/chat/ChatToolCall.vue:L15-L80`](file:///Users/hdkiller/Develop/coach-wattz/app/components/chat/ChatToolCall.vue#L15-L80)
- **Tell**: Multi-step tool call cards (Workout creation, calculation tools) truncate horizontally on 320px screens when displaying long parameters.
- **Fix**: Wrap tool execution payloads in responsive stacked preview layouts with expandable JSON accordions.

---

## ⚠️ Major Findings (Looks AI-Generated)

### 1. Repetitive Card Radius & Border Shadows in Plan Views
- **Where**: [`app/pages/plan.vue:L80-L140`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/plan.vue#L80-L140)
- **Tell**: Uniform `rounded-xl border border-gray-800 bg-gray-900/50 p-6` container structure across weekly blocks.
- **Fix**: Introduce visual hierarchy between current active training block (highlighted accent border) and past/future blocks (hairline borderless rows).

---

## 🔍 Minor Findings

### 1. Notification Dropdown Mobile Padding
- **Where**: [`app/pages/notifications.vue:L15`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/notifications.vue#L15)
- **Tell**: Missing mobile safe-area inset on long notification lists.
- **Fix**: Add `pb-[env(safe-area-inset-bottom)]` to the notification scroll area.

---

## 📊 Scorecard & Summary

- **Total Routes Audited**: 7
- **Critical**: 2
- **Major**: 1
- **Minor**: 1
- **Status**: ✅ Audited & Cataloged
