# 272 — Adherence shows 100% when athlete has zero planned workouts

**Priority:** Medium  
**Type:** Bug / UX  
**Status:** Fixed
**Area:** `coaching, analytics`

## Summary

`getAthletesForCoach` and `getEnrichedAthleteForCoach` return `adherence7d: 100` when `recentPlanned === 0`. Athletes with no plan show a perfect green compliance score instead of "no data."

## Steps to Reproduce

1. Coach an athlete with no planned workouts in the last 7 days.
2. View on `/coaching/athletes` or team roster (once 264 fixed).
3. Adherence displays 100%.

## Expected Behavior

- `adherence7d: null` or omit; UI shows `--` / "No plan".

## Actual Behavior

```ts
adherence7d: recentPlanned > 0 ? Math.round(...) : 100
```

In both list enrichment (~L209) and single-athlete enrichment (~L376).

## Affected Files

- `server/utils/repositories/coachingRepository.ts`
- `app/components/coaching/AthleteCard.vue` (or equivalent) — handle null

## Suggested Fix

- Return `null` when `recentPlanned === 0`.
- Update UI to render neutral empty state, not green 100%.

## Acceptance Criteria

- [ ] Zero planned workouts → null adherence, not 100%
- [ ] UI does not show misleading green compliance
- [ ] Athletes with plans still show correct percentage


## Follow-up (2026-07-19)

Repository returns `null` and `AthleteCard` shows `--`, but athlete detail still renders `{{ athlete.stats.adherence7d }}%` without a null check — tracked as [336](./336-athlete-detail-adherence-null-display.md).


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
