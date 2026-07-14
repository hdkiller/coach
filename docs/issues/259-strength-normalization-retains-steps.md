# 259 — Strength normalization keeps `steps` → double metrics + export blocked

**Priority:** High  
**Type:** Bug  
**Status:** Open

## Summary

`normalizeStructuredStrengthWorkout()` converts legacy/step-based gym workouts into native strength `blocks` and also emits flattened `exercises`, but it **keeps the original `steps` array** on the returned structure.

Downstream code interprets this as _two parallel representations_ of the workout and:

- **Double-counts metrics** (both generation-time and persistence-time).
- **Blocks Intervals export** when residual step-level targets (e.g. `power`) are validated against the `strength` support row.

## Impact

- Gym duration/TSS inflate roughly ~2× on affected workouts.
- Strength workouts that should export can fail with `export_blocked` due to step-level target issues that are irrelevant once `blocks` are the canonical representation.

## Likely fix

- In strength normalization, when native `blocks` are produced/used as the source of truth, **strip `steps`** from the canonical structure (or move legacy steps into blocks and then remove the original list).

## References

- `server/utils/strength-exercise-library.ts` — `normalizeStructuredStrengthWorkout()` (spreads original object, adds `blocks`/`exercises` but keeps `steps`)
- `trigger/generate-structured-workout.ts` — totals computed from `steps` plus `computeStrengthExerciseMetrics(structure.exercises)`
- `server/utils/structured-workout-persistence.ts` — metrics computed from `walk(steps)` plus block exercise collection
- `shared/workout-support-matrix.ts` — step-level targets (e.g. power) rejected for strength exports
