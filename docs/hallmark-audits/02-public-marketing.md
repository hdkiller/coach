# Hallmark Audit — Public Marketing Pages

**Targets**:
- [`app/pages/join.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/join.vue)
- [`app/pages/login.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/login.vue)
- [`app/pages/stories.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/stories.vue)
- [`app/pages/works-with.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/works-with.vue)

---

## Critical Findings (Ships as Slop)

### 1. Simulated AI Chat Conversation in Auth Aside
- **Where**: [`app/pages/join.vue:L25-L41`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/join.vue#L25-L41) & [`app/pages/login.vue:L22-L38`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/login.vue#L22-L38)
- **Tell**: `Re-drawn UI chrome` & `Invented testimonial/conversation` anti-pattern. Hardcoded fake chat messages ("What should I do today?") drawn inside a nested card inside a split-screen column.
- **Fix**: Replace fake chat cards with an authentic athlete testimonial, real training load snippet, or typographic editorial quote.

---

## Major Findings (Looks AI-Generated)

### 1. Full-Height Centered Split-Screen Auth Template
- **Where**: [`app/pages/join.vue:L3-L8`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/join.vue#L3-L8)
- **Tell**: `Full-viewport centred hero` / canonical split auth layout (`min-h-[calc(100vh-4rem)] items-center justify-center`).
- **Fix**: Use edge-aligned workbench layout or top-anchored editorial form container with distinct athletic borders.

### 2. Standard 4-Column Grid in Works-With Integration Hub
- **Where**: [`app/pages/works-with.vue:L40-L90`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/works-with.vue#L40-L90)
- **Tell**: `3-column feature grid` variant — equal-width cards for Strava, Garmin, Oura, Whoop, etc., with identical icon-heading-text structures.
- **Fix**: Group integrations by biometric category (Heart & Sleep, GPS & Power, Nutrition) with asymmetric list rows instead of identical boxed grid tiles.

---

## Minor Findings

### 1. Hardcoded Button Heights
- **Where**: [`app/pages/join.vue:L64`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/join.vue#L64)
- **Tell**: Fixed `h-14` classes on buttons rather than padding-driven touch targets.
- **Fix**: Rely on design system button size props (`size="xl"` with token spacing) for fluid scaling.

---

## Scorecard
- **Typography Purity**: Pass (Oswald headings, Public Sans body)
- **Palette Alignment**: Pass (OKLCH dark green-ink)
- **Summary**: `1 critical · 2 major · 1 minor`
