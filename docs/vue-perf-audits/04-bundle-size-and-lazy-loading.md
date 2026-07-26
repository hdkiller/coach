# Vue Performance Audit — Bundle Size & Lazy Loading

**Domain**: Component Splitting, Dynamic Imports, and Heavy Lib Bundling  
**Scope**: 218 Vue Files  
**Auditor**: Antigravity Vue Performance Specialist

---

## 📊 Summary Scorecard

| Check Item | Description                                      | Status   | Severity | Affected Files                                                                                                                                                                                            |
| ---------- | ------------------------------------------------ | -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P4.1**   | Synchronous Import of Heavy Leaflet Map Renderer | ⚠️ Major | Major    | [`MapRenderer.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/analytics/MapRenderer.vue), [`WorkoutMap.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/ui/WorkoutMap.vue) |
| **P4.2**   | Nuxt `<Lazy...>` Component Usage for Modals      | ℹ️ Minor | Minor    | Modal & Settings Components Across Pages                                                                                                                                                                  |

---

## 🔍 Detailed Audit Findings

### ⚠️ P4.1: Synchronous Import of Leaflet Map Component

- **Files**:
  - [`MapRenderer.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/analytics/MapRenderer.vue)
  - [`WorkoutMap.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/ui/WorkoutMap.vue)
- **Issue**: Leaflet (`leaflet` and `@vue-leaflet/vue-leaflet`) is loaded synchronously when parent pages mount. Users opening pages without interactive map features still download Leaflet bundle assets (~140KB gzipped).
- **Recommendation**: Wrap Map component invocations in Nuxt `<LazyMapRenderer>` or `<LazyWorkoutMap>` so Leaflet dependencies are lazy-loaded only when the map tab or card becomes visible.

```vue
<!-- Recommended Usage in Pages: -->
<LazyMapRenderer v-if="activeTab === 'map'" :data="workoutData" />
```
