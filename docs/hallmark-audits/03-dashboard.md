# Hallmark Audit — App Dashboard

**Target**: [`app/pages/dashboard.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/dashboard.vue) & [`app/components/dashboard/*`](file:///Users/hdkiller/Develop/coach-wattz/app/components/dashboard)  
**Declared Stamp**: `/* Hallmark · component: dashboard-shell · genre: modern-minimal · theme: custom green-ink */`

---

## Critical Findings (Ships as Slop)

### 1. Excessive Header Button Stacking
- **Where**: [`app/pages/dashboard.vue:L10-L90`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/dashboard.vue#L10-L90)
- **Tell**: `AI nav` tell variant — navbar contains 6 action buttons (Share, Trigger Monitor, Notification Dropdown, Release Notice, Upload Workout, Sync Data, New Chat). Violates restraint and creates visual clutter at 768px - 1024px tablet viewports.
- **Fix**: Consolidate secondary action icons into a single `UDropdownMenu` overflow menu, keeping only `Sync` and `New Chat` prominent.

---

## Major Findings (Looks AI-Generated)

### 1. Uniform Card Border Padding & Radius
- **Where**: Dashboard widget cards (`TrainingRecommendation.vue`, `AthleteProfileCard.vue`, `WeeklySummary.vue`)
- **Tell**: Uniform `rounded-xl border border-gray-800 bg-gray-900/50 p-6` repetitive card container structure.
- **Fix**: Introduce visual rhythm with contrasting surface weights (e.g., borderless primary recommendation hero vs. hairline metric table).

---

## Minor Findings

### 1. Mobile Touch Target Padding
- **Where**: [`app/pages/dashboard.vue:L96`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/dashboard.vue#L96)
- **Tell**: `quick-capture-inset` padding utility applied to root container rather than fixed bottom bar.
- **Fix**: Restrict inset padding strictly to bottom floaters.

---

## Scorecard
- **State Discipline**: Pass (Loading, Error, Empty, and Data states explicitly implemented)
- **Timezone Discipline**: Pass (Strict user-local date formatting applied via `useFormat`)
- **Summary**: `1 critical · 1 major · 1 minor`
