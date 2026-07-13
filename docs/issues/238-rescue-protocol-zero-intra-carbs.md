# 238 — LOW_FIBER_LIQUID Rescue Protocol Sets Intra-Workout Carbs to Zero

**Type:** Bug  
**Priority:** High  
**Area:** `nutrition` (fueling plan)  
**Status:** Open

## Description

In `calculateFuelingStrategy`, `targetCarbsPerHour` is initialized to `0` and the
`LOW_FIBER_LIQUID` branch runs **before** the normal duration/intensity targeting:

```ts
let targetCarbsPerHour = 0
...
} else if (workout.strategyOverride === 'LOW_FIBER_LIQUID') {
  targetCarbsPerHour = Math.min(45, targetCarbsPerHour) // Math.min(45, 0) === 0
  notes.push('RESCUE PROTOCOL: Capping intra-workout carbs at 45g/hr ...')
}
```

`Math.min(45, 0)` is always `0`, so any athlete on the GI-distress rescue protocol
(activated automatically by `remediationService` after a severe GI symptom log) gets an
intra-workout window with **0 g carbs**, while the plan note claims a 45 g/hr cap. The
rescue protocol is meant to _reduce fiber and cap carbs_, not eliminate fueling — a
multi-hour ride with 0 g/hr is a bonk risk, the opposite of a "rescue".

The intended logic is to compute the normal `targetCarbsPerHour` first and then clamp
it to 45.

## Affected Files

- `server/utils/nutrition-domain/fueling-plan.ts` (lines ~96–100)

## Acceptance Criteria

- `LOW_FIBER_LIQUID` computes the standard duration/intensity carb target and then caps
  it at 45 g/hr.
- Unit test covering all three strategy overrides asserts non-zero intra carbs for
  `LOW_FIBER_LIQUID` on a ≥1 h workout.
