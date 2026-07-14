# 262 — Strength distance prescription modes inflate duration/TSS (treated as reps)

**Priority:** High  
**Type:** Bug  
**Status:** Open

## Summary

Strength prescription modes include several `distance_*` variants (e.g. `distance_meters`), but duration/TSS estimators do not implement these modes. In practice, distance values are often treated as **reps counts**, leading to absurd work durations (e.g. 400m carry → “400 reps × 5s”).

## Impact

- Grossly inflated duration/TSS estimates.
- Coverage validation failures during generation, causing unnecessary retries or task failure.

## Likely fix

- Implement `distance_*` modes in estimators (derive duration from distance + assumed pace, or apply a conservative mapping).
- Alternatively, reject/normalize unsupported modes earlier with a corrective retry prompt.

## References

- `server/utils/structured-workout-persistence.ts` — duration estimation paths treat distance values like reps
- `server/utils/strength-exercise-library.ts` — flattening writes `exercise.reps = "400"` for distance modes before storing value/unit
