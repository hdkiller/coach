# Hallmark Audit — Category 4: Analytics & Performance

**Audited Routes (13 total)**:
- [`app/pages/analytics/index.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/analytics/index.vue) (Custom Analytics Dashboard)
- `app/pages/analytics/browse.vue` (Preset Analytics Library)
- `app/pages/analytics/builder.vue` (Widget & Query Builder)
- `app/pages/analytics/workout-comparison.vue` (Multi-Workout Stream Overlay)
- `app/pages/analytics/workout-explorer.vue` (Raw Stream Data Explorer)
- `app/pages/performance.vue` & `app/pages/performance/index.vue` (Performance Suite)
- `app/pages/performance/bests.vue` (Power & Pace Personal Records)
- [`app/pages/fitness/index.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/fitness/index.vue) & `fitness/[id].vue` (PMC Chart, Weight & BP)
- `app/pages/recovery/index.vue` (Recovery & Sleep Biometrics)
- [`app/pages/reports.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/reports.vue) & `report/[id].vue` (AI Report Center)
- `app/pages/recommendations/index.vue` & `recommendations/[id].vue` (Recommendation History)

---

## 🛑 Critical Findings (Ships as Slop)

### 1. Hardcoded Plain Red/Blue Chart Color Fallbacks
- **Where**: `app/pages/analytics/builder.vue` & `app/components/analytics/AnalyticsChart.vue`
- **Tell**: Uses standard browser fallback hex values (`#ff0000`, `#0000ff`) when custom dataset colors are missing. Violates non-generic color rule.
- **Fix**: Map chart fallbacks strictly to HSL / OKLCH design system tokens (`var(--color-green-400)`, `var(--color-paper-accent)`).

---

## ⚠️ Major Findings (Looks AI-Generated)

### 1. Quad Metric Tile Grid in Fitness Page
- **Where**: [`app/pages/fitness/index.vue:L40-L120`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/fitness/index.vue#L40-L120)
- **Tell**: Uniform 4-column metric grid for CTL/ATL/TSB/RHR with standard top label + huge number layout.
- **Fix**: Use PMC (Performance Management Chart) timeline as primary hero and present key metrics in a compact horizontal ticker tape.

---

## 🔍 Minor Findings

### 1. Template Modal Header Spacing
- **Where**: [`app/pages/reports.vue:L15-L25`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/reports.vue#L15-L25)
- **Tell**: Slight vertical alignment drift between template title and badges inside `UModal`.
- **Fix**: Use `items-baseline` alignment on title rows.

---

## 📊 Scorecard & Summary

- **Total Routes Audited**: 13
- **Critical**: 1
- **Major**: 1
- **Minor**: 1
- **Status**: ✅ Audited & Cataloged
