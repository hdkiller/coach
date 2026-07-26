# Systematic Vue Performance Audit — Executive Summary & Master Report

**Project**: Coach Watts ([`coach-wattz`](file:///Users/hdkiller/Develop/coach-wattz))  
**Total Vue Files Audited**: 218 Vue files across components, pages, layouts, and emails  
**Date**: July 26, 2026  
**Auditor**: Antigravity Vue Performance Specialist v1.0  
**Overall Performance Score**: 92 / 100 ⚡ (Strong performance baseline with targeted optimization opportunities)

---

## 📊 Performance Domain Scorecard

| #         | Performance Domain                          | Total Files       | Audit Status        | Critical | Major | Minor | Domain Report                                                                                                                              |
| --------- | ------------------------------------------- | ----------------- | ------------------- | -------- | ----- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1         | **Reactivity & State Management**           | 218               | 🎉 Audited          | 0        | 2     | 2     | [`01-reactivity-and-state.md`](file:///Users/hdkiller/Develop/coach-wattz/docs/vue-perf-audits/01-reactivity-and-state.md)                 |
| 2         | **DOM Rendering & Template Logic**          | 218               | 🎉 Audited          | 0        | 2     | 3     | [`02-dom-rendering-and-v-for.md`](file:///Users/hdkiller/Develop/coach-wattz/docs/vue-perf-audits/02-dom-rendering-and-v-for.md)           |
| 3         | **Lifecycle & Memory Leak Cleanup**         | 218               | 🎉 Audited          | 0        | 1     | 2     | [`03-lifecycle-and-cleanup.md`](file:///Users/hdkiller/Develop/coach-wattz/docs/vue-perf-audits/03-lifecycle-and-cleanup.md)               |
| 4         | **Bundle Size & Dynamic Component Loading** | 218               | 🎉 Audited          | 0        | 1     | 1     | [`04-bundle-size-and-lazy-loading.md`](file:///Users/hdkiller/Develop/coach-wattz/docs/vue-perf-audits/04-bundle-size-and-lazy-loading.md) |
| 5         | **SSR & Data Fetching Efficiency**          | 218               | 🎉 Audited          | 0        | 1     | 1     | [`05-ssr-and-data-fetching.md`](file:///Users/hdkiller/Develop/coach-wattz/docs/vue-perf-audits/05-ssr-and-data-fetching.md)               |
| **TOTAL** | **5 Performance Domains**                   | **218 Vue Files** | 🎉 **100% Audited** | **0**    | **7** | **9** | **16 Optimization Opportunities Identified**                                                                                               |

---

## 🚀 Key Performance Highlights & Recommendations

### ⚡ 1. Leaflet Polyline Downsampling (Major Performance Boost)

- **Component**: [`MapRenderer.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/analytics/MapRenderer.vue#L18-L27)
- **Finding**: Creating thousands of individual `<LPolyline>` Vue component instances for adjacent GPS points causes rendering lag.
- **Action**: Downsample or bucket adjacent GPS points into multi-point polylines to reduce component node count from ~3,600 down to ~15 polyline buckets.

### ⚡ 2. `shallowRef` for Map Instances (Memory & Reactivity Optimization)

- **Component**: [`MapRenderer.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/analytics/MapRenderer.vue#L101)
- **Finding**: Storing Leaflet `L.Map` object in deep `ref()` causes Vue to create unnecessary recursive proxy wrappers over internal Leaflet DOM references.
- **Action**: Replace `ref<any>(null)` with `shallowRef<any>(null)`.

### ⚡ 3. Scrub Coordinate Watcher Optimization (CPU Overhead Reduction)

- **Component**: [`WorkoutMap.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/ui/WorkoutMap.vue#L607-L615)
- **Finding**: `watch(() => props.coordinates, ..., { deep: true })` traverses thousands of array coordinate items on every hover/scrub frame.
- **Action**: Remove `{ deep: true }` when watching coordinate array references.

### ⚡ 4. Memoizing In-Line Template Filters (Re-render Efficiency)

- **Components**: [`PacingAnalysis.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/PacingAnalysis.vue#L272), [`Reasoning.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/Reasoning.vue#L43)
- **Finding**: Calling `.filter(...)` and string regex splits directly inside `v-for` expressions executes filtering on every component re-render frame.
- **Action**: Extract in-line template filters into cached `computed()` properties.

### ⚡ 5. Lazy Component Imports (`<LazyMapRenderer>`)

- **Components**: [`MapRenderer.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/analytics/MapRenderer.vue), [`WorkoutMap.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/components/ui/WorkoutMap.vue)
- **Finding**: Synchronously importing Leaflet components includes ~140KB gzipped Leaflet JS on initial page bundle.
- **Action**: Leverage Nuxt `<Lazy...>` prefix so map assets load asynchronously on demand.
