# Hallmark Audit — Category 7: Library & Training Plans

**Audited Routes (15 total)**:
- `app/pages/library/exercises/index.vue` (Exercise Library Catalog)
- `app/pages/library/plans/[id]/architect.vue` (Interactive Plan Architect)
- `app/pages/library/plans/[id]/index.vue` & `overview.vue` (Plan Structure Details)
- `app/pages/library/plans/index.vue` (Athlete Plan Template Library)
- `app/pages/library/workouts/[id].vue` & `index.vue` (Workout Template Library)
- [`app/pages/training-plans/index.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/training-plans/index.vue) (Public Plan Marketplace Catalog)
- `app/pages/training-plans/[slug].vue`, `[sport]/[slug].vue`, `[sport]/[subtype]/[planSlug].vue` (Marketplace Plan Detail & Tier Purchase)
- `app/pages/training-plans/access/[token].vue` (Plan Access Authorization)

---

## 🛑 Critical Findings (Ships as Slop)

### 1. Hardcoded Plain White Price Card Highlights
- **Where**: `app/components/plans/PublicPlansCatalogPage.vue:L60`
- **Tell**: Uses `#ffffff` surface background for primary plan cards. Violates non-pure white surface rule (`Pure black, pure white` gate).
- **Fix**: Tint surface towards green-ink paper hue (`bg-[oklch(14%_0.018_155)]`).

---

## ⚠️ Major Findings (Looks AI-Generated)

### 1. Repetitive Exercise Library Grid Tiles
- **Where**: `app/pages/library/exercises/index.vue:L30-L80`
- **Tell**: Standard 3-column grid with identical muscle-group badges and thumbnail boxes.
- **Fix**: Organize exercise library by movement pattern (Hinge, Squat, Push, Pull, Carry) with variable density rows.

---

## 🔍 Minor Findings

### 1. Search Bar Border Contrast
- **Where**: `app/pages/library/workouts/index.vue:L20`
- **Tell**: Faint grey border on search inputs without focus glow tokens.
- **Fix**: Use `--color-green-500` ring focus indicators.

---

## 📊 Scorecard & Summary

- **Total Routes Audited**: 15
- **Critical**: 1
- **Major**: 1
- **Minor**: 1
- **Status**: ✅ Audited & Cataloged
