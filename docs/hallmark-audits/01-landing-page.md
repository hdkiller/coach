# Hallmark Audit — Landing Page

**Target**: [`app/pages/index.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/index.vue) & [`app/components/landing/*`](file:///Users/hdkiller/Develop/coach-wattz/app/components/landing)  
**Declared Stamp**: `/* Hallmark · macrostructure: Workbench · genre: atmospheric · tone: athletic · theme: custom green-ink · display: Oswald roman · body: Public Sans · nav: N9 edge-aligned · footer: Ft2 statement · enrichment: none */`

---

## Critical Findings (Ships as Slop / Stamp Lies)

### 1. Card-in-Card Visual Nesting
- **Where**: [`app/components/landing/Hero.vue:L61-L97`](file:///Users/hdkiller/Develop/coach-wattz/app/components/landing/Hero.vue#L61-L97)
- **Tell**: `Card-in-card` anti-pattern. Outer card container (`rounded-2xl border border-white/10 bg-[oklch(14%_0.02_155)]`) contains an inner sub-card (`rounded-xl border border-white/8 bg-black/40 p-5`) with nested borders.
- **Fix**: Flatten the visual containment. Use single-level surface isolation without multi-layered bordered boxes inside bordered boxes.

### 2. Invented Social Proof & Metric Badges
- **Where**: [`app/components/landing/Community.vue:L12-L45`](file:///Users/hdkiller/Develop/coach-wattz/app/components/landing/Community.vue#L12-L45)
- **Tell**: `Invented metrics` (slop-test gate 46). Generic proof indicators and stat callouts without dynamic user backing.
- **Fix**: Replace static arbitrary counts with real dynamic stats or explicit placeholder badges ("metric to confirm") per Hallmark copy discipline.

---

## Major Findings (Looks AI-Generated / Structural Pattern)

### 1. Equal-Height Feature Cards Grid
- **Where**: [`app/components/landing/FeatureBento.vue:L15-L60`](file:///Users/hdkiller/Develop/coach-wattz/app/components/landing/FeatureBento.vue#L15-L60)
- **Tell**: `3-column feature grid` feel. Although titled Bento, 4 equal-sized grid blocks use icon-above-heading-above-paragraph repetition.
- **Fix**: Introduce true typographic and spatial asymmetry (e.g., 2:1 column spans, full-bleed text row, variable card heights).

### 2. Centered Secondary Hero Callouts
- **Where**: [`app/pages/index.vue:L17-L40`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/index.vue#L17-L40)
- **Tell**: Closing section CTA defaults to standard SaaS dual-button group.
- **Fix**: Convert closing band into an asymmetric statement block or typographic close with custom button voice.

---

## Minor Findings (Taste & Micro-details)

### 1. Repeated Icon Colors
- **Where**: [`app/components/landing/Integrations.vue:L20-L45`](file:///Users/hdkiller/Develop/coach-wattz/app/components/landing/Integrations.vue#L20-L45)
- **Tell**: Repetitive primary-color icon tinting across all integration badges.
- **Fix**: Mute background badges to `--color-paper-2` and use monochrome icons.

---

## Scorecard
- **Structural Fingerprint**: Workbench (Match: 85%)
- **Typography Purity**: Pass (Oswald roman display, Public Sans body, no italic headers)
- **Palette Discipline**: Pass (Custom OKLCH green-ink, no purple gradients)
- **Summary**: `2 critical · 2 major · 1 minor`
