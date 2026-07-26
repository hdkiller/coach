# Hallmark Audit — Category 1: Public Marketing & Landing Pages

**Audited Routes (15 total)**:
- [`app/pages/index.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/index.vue) (Landing Page)
- [`app/pages/join.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/join.vue) & `app/pages/join/[code].vue` (Signup & Invitation)
- [`app/pages/login.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/login.vue) (Login Auth)
- [`app/pages/onboarding/index.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/onboarding/index.vue) & `restart.vue` (Athlete Onboarding Flow)
- [`app/pages/stories.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/stories.vue) (Athlete Testimonials & Case Studies)
- [`app/pages/works-with.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/works-with.vue) (Integrations Directory)
- [`app/pages/pricing.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/pricing.vue) (Tiered Pricing & Plan Cards)
- [`app/pages/help-center.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/help-center.vue) (Help & Knowledge Base)
- [`app/pages/brand-manual.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/brand-manual.vue) (Brand Manual & Design System)
- [`app/pages/architecture.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/architecture.vue) (AI Engine Architecture)
- [`app/pages/terms.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/terms.vue), `privacy.vue`, `cookies.vue`, `unsubscribe.vue`, `support.vue` (Legal & Support Footprint)

**Layouts**: `app/layouts/home.vue`, `app/layouts/public.vue`

---

## 🛑 Critical Findings (Ships as Slop / Stamp Lies)

### 1. Simulated AI Chat Prompt Card in Auth Sidebar
- **Where**: [`app/pages/join.vue:L26-L41`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/join.vue#L26-L41) & [`app/pages/login.vue:L22-L31`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/login.vue#L22-L31)
- **Tell**: `Re-drawn UI chrome` & `Invented testimonial/conversation` anti-pattern. Fake mock user question ("What should I do today?") drawn inside a nested card next to the login form.
- **Fix**: Replace simulated chat box with an authentic quote, actual biometric chart snippet, or typographic editorial quote.

### 2. Card-in-Card Nesting in Landing Hero
- **Where**: [`app/components/landing/Hero.vue:L61-L97`](file:///Users/hdkiller/Develop/coach-wattz/app/components/landing/Hero.vue#L61-L97)
- **Tell**: `Card-in-card` anti-pattern. Outer card container (`rounded-2xl border border-white/10 bg-[oklch(14%_0.02_155)]`) contains an inner sub-card (`rounded-xl border border-white/8 bg-black/40 p-5`) with nested borders.
- **Fix**: Flatten the visual container. Use single-level surface isolation without multi-layered bordered boxes inside bordered boxes.

---

## ⚠️ Major Findings (Looks AI-Generated)

### 1. Repetitive Feature Grid Spans
- **Where**: [`app/components/landing/FeatureBento.vue:L15-L60`](file:///Users/hdkiller/Develop/coach-wattz/app/components/landing/FeatureBento.vue#L15-L60)
- **Tell**: `3-column feature grid` feel. Although titled Bento, 4 equal-sized grid blocks use icon-above-heading-above-paragraph repetition.
- **Fix**: Introduce true typographic and spatial asymmetry (e.g., 2:1 column spans, full-bleed text row, variable card heights).

### 2. Uniform Integrations Card Grid
- **Where**: [`app/pages/works-with.vue:L40-L90`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/works-with.vue#L40-L90)
- **Tell**: Equal-width cards for Strava, Garmin, Oura, Whoop, etc., with identical icon-heading-text structures.
- **Fix**: Group integrations by biometric category (Heart & Sleep, GPS & Power, Nutrition) with asymmetric list rows instead of identical boxed grid tiles.

---

## 🔍 Minor Findings (Taste & Micro-details)

### 1. Hardcoded Button Height Classes
- **Where**: [`app/pages/join.vue:L64`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/join.vue#L64) & [`app/pages/login.vue:L54`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/login.vue#L54)
- **Tell**: Fixed `h-14` class on buttons rather than padding-driven touch targets.
- **Fix**: Rely on design system button size props (`size="xl"` with token spacing) for fluid scaling.

---

## 📊 Scorecard & Summary

- **Total Routes Audited**: 15
- **Critical**: 2
- **Major**: 2
- **Minor**: 1
- **Status**: ✅ Audited & Cataloged
