# 001 — Empty structures can persist as successful generation

**Type:** Bug  
**Priority:** Critical  
**Area:** `ai`, `workouts`, `backend`  
**Status:** In Progress — [PR #214](https://github.com/hdkiller/coach/pull/214) (+ `assertRenderableStructure` for [001](./001-zero-step-structure-persistence.md))

## Description

The structured workout generation pipeline can persist a `structuredWorkout` object that contains narrative fields (`description`, `coachInstructions`) but **no renderable steps, exercises, or blocks**. The task completes with `{ success: true }`, leaving users with workouts that appear to have been generated but show no interval chart or executable structure.

This matches an active production defect family documented in support tickets (accounts with large counts of `step_count = 0` structured workouts).

## Root Cause

Final validation in `generate-structured-workout.ts` only rejects zero duration/TSS when steps or exercises **exist**:

```1708:1715:trigger/generate-structured-workout.ts
    const hasSteps = Array.isArray(structure.steps) && structure.steps.length > 0
    const hasExercises = Array.isArray(structure.exercises) && structure.exercises.length > 0
    if ((hasSteps || hasExercises) && totalDuration <= 0) {
      throw new Error('Generated structured workout has zero total duration')
    }
    if ((hasSteps || hasExercises) && totalTSS <= 0) {
      throw new Error('Generated structured workout has zero total TSS')
    }
```

When the AI returns `{ description, coachInstructions, steps: [] }` (and no exercises/blocks counted), **none of these guards fire** and the structure is written to the database.

The same pattern exists in `trigger/adjust-structured-workout.ts`.

Coverage validation during the retry loop may catch some cases (zero duration vs planned duration), but:

- Strength workouts using `blocks` instead of `steps`/`exercises` may not be fully covered (see [011](./011-strength-blocks-validation-gap.md)).
- Historical records may predate stricter validation.
- Partial/description-only payloads may have been written through other code paths.

## Steps to Reproduce

1. Trigger structure generation for a planned workout (Build Structure or via chat).
2. Simulate or observe an AI response with empty `steps: []`, valid description text, and no blocks/exercises.
3. Task completes successfully.
4. Planned workout details page shows coach text but no interval structure or chart.

## Expected Behavior

- Generation should **fail** if the result has no previewable structure (steps, exercises, or strength blocks).
- Task output should be `{ success: false }` with a clear error.
- No empty `structuredWorkout` should be persisted.

## Actual Behavior

- Empty or description-only structures can be saved.
- UI may show narrative guidance with no chart (mitigated partially by frontend empty-state handling added 2026-06-26, but root cause remains in generation/persistence).

## Affected Files

- `trigger/generate-structured-workout.ts` (~1708–1715, persistence block ~1759)
- `trigger/adjust-structured-workout.ts` (equivalent validation)
- `server/utils/planned-workout-structure-sync.ts` (`buildStructureEditFields`)

## Suggested Fix

1. Add a shared `assertRenderableStructure(structure, workoutType)` helper used by both generate and adjust tasks.
2. Require at least one of: non-empty `steps`, non-empty `exercises`, or non-empty strength `blocks`.
3. Return `{ success: false, error: '...' }` instead of persisting.
4. Consider a one-time backfill/re-generation job for existing zero-step records (separate maintenance task).

## Related

- Support cluster 3 in [support-ticket-task-list-2026-06-16.md](../06-plans/support-ticket-task-list-2026-06-16.md)
- [plans/training/workout-safety-layer-plan.md](../../plans/training/workout-safety-layer-plan.md) — proposed validation layer before persistence

## Acceptance Criteria

- [ ] Generate and adjust tasks reject structures with zero renderable content
- [ ] Failed rejection surfaces as `{ success: false }` to the UI
- [ ] Regression test covers empty steps array with description-only payload
- [ ] Production zero-step rate measurable after deploy
