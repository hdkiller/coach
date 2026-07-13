# 246 — `repairMetabolicChain` Recurses Unbounded for Future Dates and Races on Create

**Type:** Bug  
**Priority:** Medium  
**Area:** `nutrition` (metabolic chain)  
**Status:** Open

## Description

Two latent problems in `metabolicService.repairMetabolicChain` (currently CLI-only, see
[239](./239-metabolic-chain-never-persisted.md), but they bite as soon as it is wired
into production):

1. **Unbounded recursion for future targets.** The recursion guard is
   `shouldSimulate = yesterday >= todayLocal || recursionDepth < 5`. For a target date
   N days in the future, `yesterday >= todayLocal` stays true all the way back to
   today, so the depth limit is bypassed and the function recurses ~N levels — running
   a full day-simulation **and two DB writes per level** (it creates anchor `Nutrition`
   rows for every day in the span). A request for a date a year out would create ~365
   records and run ~365 simulations.
2. **Duplicate-create race.** The persistence step uses `nutritionRepository.create()`
   (not upsert) for missing days. Two concurrent chain repairs for overlapping ranges
   both pass the `getByDate` check and then both `create`, and the second throws on the
   `@@unique([userId, date])` constraint, aborting the chain mid-repair.

## Affected Files

- `server/utils/services/metabolicService.ts` (`repairMetabolicChain`)

## Acceptance Criteria

- Recursion depth is bounded regardless of how far in the future the target date is
  (e.g. cap the simulated span, or resolve future dates iteratively from today).
- Missing-day persistence uses upsert keyed on `(userId, date)`.
