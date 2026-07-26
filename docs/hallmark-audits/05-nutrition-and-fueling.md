# Hallmark Audit — Category 5: Nutrition & Fueling

**Audited Routes (3 total)**:
- [`app/pages/nutrition/index.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/nutrition/index.vue) (Daily Macro & Intra-Workout Fueling Dashboard)
- [`app/pages/nutrition/history.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/nutrition/history.vue) (Nutritional History & Periodization Logs)
- `app/pages/nutrition/[id].vue` (Single Meal & Fuel Log Details)

---

## 🛑 Critical Findings (Ships as Slop)

### 1. Hardcoded Macro Percentages Progress Rings
- **Where**: [`app/pages/nutrition/index.vue:L120-L200`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/nutrition/index.vue#L120-L200)
- **Tell**: Generic blue/green/orange macro progress rings without brand-scoped HSL color variables.
- **Fix**: Map macro progress rings to green-ink theme tokens (`--color-green-400`, `--color-paper-3`, `--color-primary-500`).

---

## ⚠️ Major Findings (Looks AI-Generated)

### 1. Symmetrical Meal Log Cards
- **Where**: [`app/pages/nutrition/index.vue:L300-L420`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/nutrition/index.vue#L300-L420)
- **Tell**: Breakfast, Lunch, Dinner, Snacks cards have identical bordered box shapes with no visual distinction for intra-workout workout fueling.
- **Fix**: Elevate intra-workout / race-fueling log blocks into a bold athletic performance callout row.

---

## 🔍 Minor Findings

### 1. Refresh Button Spin State
- **Where**: [`app/pages/nutrition/index.vue:L27`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/nutrition/index.vue#L27)
- **Tell**: Uses Lucide icon `i-lucide-refresh-cw` while navbar uses Heroicons `i-heroicons-arrow-path`.
- **Fix**: Standardize on Heroicons refresh icon across all layout headers.

---

## 📊 Scorecard & Summary

- **Total Routes Audited**: 3
- **Critical**: 1
- **Major**: 1
- **Minor**: 1
- **Status**: ✅ Audited & Cataloged
