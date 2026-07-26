# Hallmark Audit — Category 8: Coaching & Team Portal

**Audited Routes (13 total)**:
- `app/pages/coach/[slug]/index.vue`, `home.vue`, `join.vue`, `start.vue` (Public Coach Landing & Onboarding)
- `app/pages/coaches/[slug].vue` (Public Coach Bio)
- `app/pages/coaching.vue`, `coaching/index.vue`, `coaching/calendar.vue` (Coaching Dashboard)
- `app/pages/coaching/athletes/index.vue`, `coaching/athletes/[id]/index.vue` (Roster & Individual Athlete Hub)
- `app/pages/coaching/team/index.vue`, `coaching/teams/[id].vue` (Team & Squad Roster)
- `app/pages/partners/[slug].vue` (Partner Brand Page)

---

## 🛑 Critical Findings (Ships as Slop)

### 1. Hardcoded Plain White Editor Container Rail
- **Where**: `app/components/public/CoachStartPageEditorRail.vue:L40`
- **Tell**: Pure white `#ffffff` canvas container used in coach site preview mode. Violates pure white background rule.
- **Fix**: Use `--color-paper` dark theme tokens for preview canvases (`bg-[oklch(14%_0.018_155)]`).

---

## ⚠️ Major Findings (Looks AI-Generated)

### 1. Uniform Athlete Roster Table Layout
- **Where**: `app/pages/coaching/athletes/index.vue:L50-L110`
- **Tell**: Generic table rows with identical avatar-name-status-actions arrangement.
- **Fix**: Add quick-view athletic status indicator pills (On Track, Fatigue Warning, Peak Week) to roster rows.

---

## 🔍 Minor Findings

### 1. Action Button Icon Size Mismatch
- **Where**: `app/pages/coaching/index.vue:L30`
- **Tell**: Icon sizes vary between 16px and 20px in coach navbar actions.
- **Fix**: Enforce standardized `h-4 w-4` icon dimensions.

---

## 📊 Scorecard & Summary

- **Total Routes Audited**: 13
- **Critical**: 1
- **Major**: 1
- **Minor**: 1
- **Status**: ✅ Audited & Cataloged
