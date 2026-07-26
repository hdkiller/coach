# Hallmark Audit — Category 3: Workouts & Activities

**Audited Routes (10 total)**:
- [`app/pages/activities.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/activities.vue) (Activities List & Table)
- [`app/pages/workouts/index.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/workouts/index.vue) (Workout History)
- [`app/pages/workouts/upload.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/workouts/upload.vue) (FIT File Manual Upload)
- [`app/pages/activity-icons.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/activity-icons.vue) (Activity Icon Catalog)
- [`app/pages/workouts/[id]/index.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/workouts/%5Bid%5D/index.vue) (Workout Details)
- `app/pages/workouts/[id]/intervals.vue` (Interval Analysis)
- `app/pages/workouts/[id]/map.vue` (GPS & Route Map)
- `app/pages/workouts/[id]/share.vue` (Share Card Generator)
- `app/pages/workouts/planned/[id]/index.vue` (Planned Structured Workout)
- `app/pages/workouts/planned/[id]/charts.vue` (Target Workout Streams)

---

## 🛑 Critical Findings (Ships as Slop)

### 1. Italicized Subtitle Headline in FIT Upload Page
- **Where**: [`app/pages/workouts/upload.vue:L32`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/workouts/upload.vue#L32)
- **Tell**: `Italic headers` anti-pattern (slop-test gate 38a). `text-[10px] font-bold text-gray-500 uppercase tracking-widest italic`.
- **Fix**: Remove `italic` class. All headings and display type must remain roman (`font-style: normal`).

### 2. Manual HTML Table Overflow on Mobile Activities Page
- **Where**: [`app/pages/activities.vue:L300-L450`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/activities.vue#L300-L450)
- **Tell**: Nuxt UI v4 table rendering workaround resulted in unstyled table rows on mobile (< 414px) without horizontal scroll containment.
- **Fix**: Apply `overflow-x: auto` container with `--space-*` token padding and density toggle for athletic metrics.

---

## ⚠️ Major Findings (Looks AI-Generated)

### 1. Dense Metric Card Grid Repetition
- **Where**: [`app/pages/workouts/[id]/index.vue:L100-L220`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/workouts/%5Bid%5D/index.vue#L100-L220)
- **Tell**: 6 identical score cards (np, hr, power, cad, TSS, IF) with uniform top label + large stat callout layout.
- **Fix**: Re-organize into a split athletic stream banner with 3 primary metrics highlighted and secondary stats in a compact density row.

---

## 🔍 Minor Findings

### 1. Icon Library Mixing
- **Where**: Activity type badges across activities table vs workout detail header
- **Tell**: Mixed usage of Heroicons and Phosphor icons.
- **Fix**: Standardize icon sets across activity views.

---

## 📊 Scorecard & Summary

- **Total Routes Audited**: 10
- **Critical**: 2
- **Major**: 1
- **Minor**: 1
- **Status**: ✅ Audited & Cataloged
