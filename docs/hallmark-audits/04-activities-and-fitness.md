# Hallmark Audit — Activities & Fitness

**Targets**:
- [`app/pages/activities.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/activities.vue)
- [`app/pages/fitness/index.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/fitness/index.vue)

---

## Critical Findings (Ships as Slop)

### 1. Manual HTML Table fallback for complex data without clean density styling
- **Where**: [`app/pages/activities.vue:L300-L450`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/activities.vue#L300-L450)
- **Tell**: Nuxt UI v4 table rendering workaround resulted in unstyled table rows on mobile (< 414px) without horizontal scroll containment.
- **Fix**: Apply `overflow-x: auto` container with `--space-*` token padding and density toggle for athletic metrics.

---

## Major Findings (Looks AI-Generated)

### 1. Repetitive Metric Stat Badges
- **Where**: [`app/pages/fitness/index.vue:L40-L120`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/fitness/index.vue#L40-L120)
- **Tell**: Uniform 4-column metric grid for CTL/ATL/TSB/RHR with standard top label + huge number layout.
- **Fix**: Use PMC (Performance Management Chart) timeline as primary hero and present key metrics in a compact horizontal ticker tape.

---

## Minor Findings

### 1. Icon Color Inconsistency
- **Where**: Activity sport type badges (Run, Ride, Swim, Gym)
- **Tell**: Mixed usage of Lucide vs. Heroicons icon collections.
- **Fix**: Standardize on Heroicons or Iconify Ph (Phosphor) across all activity feeds.

---

## Scorecard
- **Responsive Widths**: Pass at 768px, requires scroll containment fix at 320px
- **Summary**: `1 critical · 1 major · 1 minor`
