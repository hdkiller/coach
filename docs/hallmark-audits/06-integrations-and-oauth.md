# Hallmark Audit — Category 6: Integrations & OAuth

**Audited Routes (12 total)**:
- `app/pages/connect-fitbit.vue`
- `app/pages/connect-hevy.vue`
- `app/pages/connect-intervals.vue`
- `app/pages/connect-liftosaur.vue`
- `app/pages/connect-oura.vue`
- [`app/pages/connect-strava.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/connect-strava.vue)
- `app/pages/connect-wahoo.vue`
- `app/pages/connect-whoop.vue`
- `app/pages/connect-withings.vue`
- `app/pages/connect-yazio.vue`
- `app/pages/oauth/authorize.vue`
- `app/pages/oauth/login.vue`

---

## 🛑 Critical Findings (Ships as Slop)

### 1. Template-Swapped Integration Connect Pages
- **Where**: All 10 `connect-*.vue` pages
- **Tell**: Identical layout structure (`max-w-2xl mx-auto` -> `UCard` header logo + title -> `UAlert` status -> connect button) duplicated across 10 separate file templates. Hallmark structural variety rule violation.
- **Fix**: Consolidate integration detail drawers/modals into a unified dynamic integration workspace with brand accent borders.

---

## ⚠️ Major Findings (Looks AI-Generated)

### 1. Plain White Brand Logo Badge Backgrounds
- **Where**: [`app/pages/connect-strava.vue:L28`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/connect-strava.vue#L28)
- **Tell**: Hardcoded `bg-white` container box for dark mode integration logo badges.
- **Fix**: Use translucent neutral container tokens (`bg-white/5 dark:bg-white/5 ring-1 ring-white/10`).

---

## 🔍 Minor Findings

### 1. Status Indicator Text Neutrality
- **Where**: `app/pages/connect-oura.vue:L45`
- **Tell**: Uses standard grey muted text instead of subtle green connected status badge.
- **Fix**: Use athletic status badge indicators (`UBadge color="primary"`).

---

## 📊 Scorecard & Summary

- **Total Routes Audited**: 12
- **Critical**: 1
- **Major**: 1
- **Minor**: 1
- **Status**: ✅ Audited & Cataloged
