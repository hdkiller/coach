# 241 — `adjust-fueling-post-workout` Never Triggered and Its kJ Formula Is Wrong

**Type:** Bug  
**Priority:** Medium  
**Area:** `nutrition` (trigger tasks)  
**Status:** Open

## Description

`trigger/adjust-fueling-post-workout.ts` (boost recovery targets when a completed ride
was much harder than planned) has three problems:

1. **Never triggered.** No `tasks.trigger('adjust-fueling-post-workout')` or import of
   `adjustFuelingPostWorkoutTask` exists anywhere in `server/` or `trigger/`. Dead
   feature.
2. **Planned-kJ estimate is off by ~2 orders of magnitude.**
   `plannedKj = durationSec * workIntensity * 60` — for a 1 h ride at IF 0.8 that's
   `3600 × 0.8 × 60 ≈ 172,800 "kJ"` vs a realistic actual of ~700 kJ. `actualKj >
plannedKj * 1.1` could therefore never be true even if the task ran. A sane estimate
   needs FTP: `ftp × IF × durationSec / 1000`.
3. **Advice string renders "undefined".** Windows produced by
   `calculateFuelingStrategy` have `description`, not `advice`, so
   `` `${currentWindow.advice} (Boosted by +30g C...)` `` yields
   `"undefined (Boosted by +30g C due to high intensity effort!)"`.

## Affected Files

- `trigger/adjust-fueling-post-workout.ts`

## Acceptance Criteria

- Task is triggered from the completed-workout ingest/link flow (or removed).
- Planned energy estimate uses FTP-based kJ, with tests around the "harder than
  planned" threshold.
- Boost note appends to `description` (or a defined `advice` field) without
  `undefined`.
