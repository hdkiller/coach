# Hallmark Audit — Category 12: Admin Suite

**Audited Routes (30 total)**:
- [`app/pages/admin/index.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/admin/index.vue) (Admin Dashboard Overview)
- `app/pages/admin/audit-logs.vue` (Audit Event Log)
- `app/pages/admin/system-messages.vue` (System Announcements CRUD)
- `app/pages/admin/webhooks.vue` & `emails.vue` (Webhook Dispatch & Email Log)
- `app/pages/admin/subscriptions.vue` (Stripe Revenue & Subscriptions)
- `app/pages/admin/users/index.vue` & `users/[id].vue` (User Management)
- `app/pages/admin/issues/index.vue` & `issues/[id].vue` (Issue Tracker)
- `app/pages/admin/ai/logs.vue`, `ai/failed-requests.vue`, `llm/settings.vue`, `llm/logs/[id].vue` (LLM Observability)
- `app/pages/admin/stats/*` (11 Analytics & Usage Breakdown Pages)
- `app/pages/admin/debug/*` (System Info, Env, Ping, Trigger Debugger)

**Layout**: `app/layouts/admin.vue`

---

## 🛑 Critical Findings (Ships as Slop)

### 1. Manual HTML Table Layouts Without Density Controls
- **Where**: `app/pages/admin/stats/llm/index.vue:L40` & `app/pages/admin/audit-logs.vue:L30`
- **Tell**: Manual HTML table fallback for Nuxt UI v4 rendering issues lacks dense tabular numerical formatting (`font-mono font-numeric`).
- **Fix**: Apply monospace numeric formatting and dense compact table utility classes.

---

## ⚠️ Major Findings (Looks AI-Generated)

### 1. Grid Tile Repetition Across Stats Pages
- **Where**: `app/pages/admin/stats/index.vue:L20-L80`
- **Tell**: Standard 4-tile KPI summary row (Users, Revenue, AI Costs, Errors) repeated across all admin stat views.
- **Fix**: Use asymmetric status board layout with live system health indicators.

---

## 🔍 Minor Findings

### 1. Secret Masking Icon Tooltips
- **Where**: `app/pages/admin/debug/env.vue:L40`
- **Tell**: Unmask toggle button tooltip alignment.
- **Fix**: Add `shortcut` and `side="left"` to tooltips.

---

## 📊 Scorecard & Summary

- **Total Routes Audited**: 30
- **Critical**: 1
- **Major**: 1
- **Minor**: 1
- **Status**: ✅ Audited & Cataloged
