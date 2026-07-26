# Vue Performance Audit — SSR & Data Fetching Efficiency

**Domain**: Server-Side Execution, Parallel Requests, and Watcher Bouncing  
**Scope**: 218 Vue Files  
**Auditor**: Antigravity Vue Performance Specialist

---

## 📊 Summary Scorecard

| Check Item | Description                                       | Status   | Severity | Affected Files                                                                                                                                                                                                                                                                                                          |
| ---------- | ------------------------------------------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P5.1**   | Server Execution Guards on Watcher `$fetch` Calls | 🟢 Fixed | Major    | [`WeeklyZoneSummary.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/WeeklyZoneSummary.vue), [`WeeklyZoneDetailModal.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/WeeklyZoneDetailModal.vue), [`activities.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/activities.vue) |
| **P5.2**   | Parallel API Requests with `Promise.all`          | ℹ️ Minor | Minor    | [`dashboard.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/dashboard.vue#L120)                                                                                                                                                                                                                              |

---

## 🔍 Detailed Audit Findings

### 🟢 P5.1: Watcher Server Execution Guards (Remediated)

- **Problem**: In components with reactive props or query watchers, calling `$fetch` directly inside watcher callbacks caused `$fetch` to execute during SSR hydration, leading to `401 Unauthorized` errors when auth headers were missing on node.js server context.
- **Fix Applied**: Added `if (import.meta.server) return` guards at the top of watcher callbacks across `WeeklyZoneSummary.vue`, `WeeklyZoneDetailModal.vue`, and `activities.vue`.

---

### ℹ️ P5.2: Parallel Data Fetching in Pages

- **File**: [`dashboard.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/dashboard.vue)
- **Status**: 🟢 Dashboard uses `useAsyncData('dashboard', () => Promise.all([...]))` to execute initial backend data fetches concurrently rather than sequentially, minimizing roundtrip TTFB.
