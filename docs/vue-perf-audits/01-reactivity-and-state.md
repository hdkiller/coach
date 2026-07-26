# Vue Performance Audit — Reactivity & State Management

**Domain**: Reactivity, `shallowRef` Optimization, and Deep Watch Overhead  
**Scope**: 218 Vue Files  
**Auditor**: Antigravity Vue Performance Specialist

---

## 📊 Summary Scorecard

| Check Item | Description                                      | Status   | Severity | Affected Files                                                                                                            |
| ---------- | ------------------------------------------------ | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| **P1.1**   | Deep `ref()` for External Map / Canvas Instances | ⚠️ Major | Major    | [`MapRenderer.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/analytics/MapRenderer.vue#L101)             |
| **P1.2**   | High-Frequency Deep Watcher Overhead             | ⚠️ Major | Major    | [`WorkoutMap.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/ui/WorkoutMap.vue#L551-L614)                 |
| **P1.3**   | Deep Watcher Log Churn in Step Editors           | ℹ️ Minor | Minor    | [`WorkoutRunChart.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/workouts/WorkoutRunChart.vue#L752-L771) |
| **P1.4**   | Large Stream Data Reactivity Proxies             | ℹ️ Minor | Minor    | [`PacingAnalysis.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/PacingAnalysis.vue#L400)                 |

---

## 🔍 Detailed Audit Findings

### ⚠️ P1.1: Deep `ref()` for External Leaflet Map Instance

- **File**: [`MapRenderer.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/analytics/MapRenderer.vue#L101)
- **Issue**: `const mapObject = ref<any>(null)` stores the Leaflet `L.Map` object inside a deep Vue reactive `ref()`. Leaflet map objects contain internal DOM nodes, listeners, and timers. Wrapping them in Vue deep proxies adds unnecessary memory overhead and risk of circular reference tracking.
- **Recommendation**: Replace `ref<any>(null)` with `shallowRef<any>(null)` or use `markRaw(map)`.

```typescript
// Recommended Fix:
import { shallowRef } from 'vue'
const mapObject = shallowRef<any>(null)
```

---

### ⚠️ P1.2: Deep Watcher Overhead on High-Frequency Scrub Coordinates

- **File**: [`WorkoutMap.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/ui/WorkoutMap.vue#L551-L614)
- **Issue**: `watch(() => props.coordinates, ..., { deep: true })` watches an array containing thousands of GPS coordinate tuples with `{ deep: true }`. Every chart scrub / hover triggers recursive property traversal of thousands of array items.
- **Recommendation**: Remove `{ deep: true }` when watching array references or watch coordinate array length / bounds.

```typescript
// Recommended Fix:
watch(
  () => props.coordinates,
  () => {
    setTimeout(() => {
      fitBounds()
    }, 100)
  }
  // Removed { deep: true }
)
```

---

### ℹ️ P1.3: Deep Watcher Log Churn in Step Editors

- **File**: [`WorkoutRunChart.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/workouts/WorkoutRunChart.vue#L752-L771)
- **Issue**: `watch(() => normalizedSteps.value, ..., { deep: true })` triggers `debugLog()` snapshots on every step edit.
- **Recommendation**: Guard debug logging behind `import.meta.dev` or `process.env.NODE_ENV === 'development'`.
