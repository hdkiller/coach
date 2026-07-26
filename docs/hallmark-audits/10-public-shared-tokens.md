# Hallmark Audit — Category 10: Public Shared Tokens

**Audited Routes (7 total)**:
- `app/pages/share/chat/[token].vue` (Shared AI Chat Thread)
- `app/pages/share/nutrition/[token].vue` (Shared Daily Fuel Summary)
- `app/pages/share/plan/[token].vue` (Shared Weekly Training Plan)
- `app/pages/share/planned-workout/[token].vue` (Shared Planned Workout)
- `app/pages/share/profile/[token].vue` (Shared Public Athlete Bio Card)
- `app/pages/share/wellness/[token].vue` (Shared Biometrics & Recovery)
- `app/pages/share/workouts/[token].vue` (Shared Workout Stream & Performance)

**Layout**: `app/layouts/share.vue`

---

## 🛑 Critical Findings (Ships as Slop)

### 1. Hardcoded Grey Footer Chrome on Share Layout
- **Where**: `app/layouts/share.vue:L35`
- **Tell**: Uses `bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800` generic footer band.
- **Fix**: Use Hallmark Ft2 Inline statement footer with `--color-paper` dark green-ink tokens.

---

## ⚠️ Major Findings (Looks AI-Generated)

### 1. Duplicate App Header Bar on Public Shared Pages
- **Where**: `app/pages/share/chat/[token].vue:L20`
- **Tell**: Shares full app top navbar instead of clean minimal public branding badge.
- **Fix**: Replace app navbar with N9 edge-aligned quiet share banner.

---

## 🔍 Minor Findings

### 1. Social Sharing Open Graph Meta Tags
- **Where**: `app/pages/share/workouts/[token].vue:L15`
- **Tell**: Default generic fallback OG image when specific workout map thumbnail is missing.
- **Fix**: Generate dynamic fallback SVG social card with athlete metrics.

---

## 📊 Scorecard & Summary

- **Total Routes Audited**: 7
- **Critical**: 1
- **Major**: 1
- **Minor**: 1
- **Status**: ✅ Audited & Cataloged
