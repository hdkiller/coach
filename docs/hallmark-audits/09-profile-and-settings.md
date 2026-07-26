# Hallmark Audit — Category 9: Profile & Settings

**Audited Routes (12 total)**:
- `app/pages/profile/athlete.vue` (Athlete Profile Form)
- `app/pages/profile/goals.vue` (Athlete Goal Wizard & Targets)
- `app/pages/profile/settings.vue` (User Preferences & Timezone)
- `app/pages/athlete/[slug].vue` (Public Athlete Profile Card)
- [`app/pages/settings.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/settings.vue) & `settings/index.vue` (Settings Shell)
- `app/pages/settings/ai.vue` (AI Model & Persona Settings)
- `app/pages/settings/apps.vue` (Connected Integration Apps)
- `app/pages/settings/billing.vue` (Stripe & Pricing Tier Subscription)
- `app/pages/settings/changelog.vue` & `release-notes.vue` (App Release Notes)
- `app/pages/settings/danger.vue` (Account Deletion & Danger Zone)
- `app/pages/settings/developer.vue` (Developer API Tokens)

---

## 🛑 Critical Findings (Ships as Slop)

### 1. Hardcoded Red Border Warning in Danger Zone
- **Where**: `app/pages/settings/danger.vue:L30`
- **Tell**: Uses raw `#ff0000` / `border-red-600` instead of design system error token (`var(--color-error)` / `color="error"`).
- **Fix**: Replace raw red borders with semantic `color="error"` variant props.

---

## ⚠️ Major Findings (Looks AI-Generated)

### 1. Standard Vertical Form Tab Bar
- **Where**: `app/pages/settings.vue:L20-L50`
- **Tell**: Generic sidebar link list for settings tabs.
- **Fix**: Use edge-aligned workbench navigation layout with clear sub-section badges.

---

## 🔍 Minor Findings

### 1. Timezone Select Dropdown Search Width
- **Where**: `app/pages/profile/settings.vue:L45`
- **Tell**: Timezone search select field truncates long IANA timezone names on 320px screens.
- **Fix**: Apply `truncate` and `min-w-0` properties to select option labels.

---

## 📊 Scorecard & Summary

- **Total Routes Audited**: 12
- **Critical**: 1
- **Major**: 1
- **Minor**: 1
- **Status**: ✅ Audited & Cataloged
