# Vue Performance Audit — DOM Rendering & Template Logic

**Domain**: Template Expressions, Memoization, and `v-for` Keying  
**Scope**: 218 Vue Files  
**Auditor**: Antigravity Vue Performance Specialist

---

## 📊 Summary Scorecard

| Check Item | Description                                        | Status   | Severity | Affected Files                                                                                                                                                                                                                     |
| ---------- | -------------------------------------------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P2.1**   | Over-rendering 3,000+ Separate Polyline Components | ⚠️ Major | Major    | [`MapRenderer.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/analytics/MapRenderer.vue#L18-L27)                                                                                                                   |
| **P2.2**   | In-Line Array Filtering in Template `v-for` Loops  | ⚠️ Major | Major    | [`PacingAnalysis.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/PacingAnalysis.vue#L272), [`activities.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/activities.vue#L592)                            |
| **P2.3**   | In-Line Regex String Splitting in Template         | ℹ️ Minor | Minor    | [`Reasoning.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/Reasoning.vue#L43)                                                                                                                                     |
| **P2.4**   | Dynamic Item List Index-Keying                     | ℹ️ Minor | Minor    | [`FuelingTimeline.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/nutrition/FuelingTimeline.vue#L4), [`WorkoutChart.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/workouts/WorkoutChart.vue#L66) |
| **P2.5**   | Category Filter Overhead in Template               | ℹ️ Minor | Minor    | [`TrophyCase.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/profile/TrophyCase.vue#L120)                                                                                                                          |

---

## 🔍 Detailed Audit Findings

### ⚠️ P2.1: Polyline Downsampling in Map Component

- **File**: [`MapRenderer.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/analytics/MapRenderer.vue#L18-L27)
- **Issue**: `coloredSegments` creates a separate `<LPolyline>` Vue component instance for every adjacent pair of GPS trackpoints. On a 1-hour activity with 3,600 GPS points, Vue instantiates and renders 3,600 component instances, causing heavy initial mount lag.
- **Recommendation**: Group adjacent segments with similar color hues into multi-point polyline buckets (reducing component count from 3,600 down to ~15-30 polyline buckets).

---

### ⚠️ P2.2: In-Line Array Filtering inside Template `v-for`

- **File**: [`PacingAnalysis.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/PacingAnalysis.vue#L272), [`activities.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/activities.vue#L592)
- **Issue**: Executing `.filter((s) => ...)` inline in `v-for` causes the filter function to run on every single component render frame.
- **Recommendation**: Move template array filtering into memoized `computed()` properties.

```typescript
// Recommended Fix in PacingAnalysis.vue:
const filteredSurges = computed(() => {
  return (streams.value?.surges || []).filter((s) => s.avgWatts > s.threshold * 1.1)
})
```

---

### ℹ️ P2.3: In-Line String Splitting & Regex Cleaning

- **File**: [`Reasoning.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/Reasoning.vue#L43)
- **Issue**: `cleanMarkdown(text).split('\n').filter(Boolean)` runs string transformation and splitting inline in the template.
- **Recommendation**: Extract into `const textLines = computed(() => ...)` property.
