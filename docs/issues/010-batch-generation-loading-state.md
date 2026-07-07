# 010 — Batch week generation clears loading before jobs finish

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux`, `planning`  
**Status:** Open

## Description

On the Plan Dashboard, `generateAllStructureForWeek()` sets `generatingAllStructures.value = false` in a `finally` block immediately after **queuing** all generation jobs — not when tasks complete.

## Location

```1590:1649:app/components/plans/PlanDashboard.vue
    generatingAllStructures.value = true
    ...
    } finally {
      generatingAllStructures.value = false
    }
```

Per-workout tracking via `generatingStructureForWorkoutId` is cleared on `onTaskCompleted`, but the global batch loading flag drops early.

## Impact

- Batch button re-enables while many structure jobs may still be running.
- User may trigger duplicate batch runs or navigate away thinking work is done.
- Toast says "Waiting for AI to finish" but UI no longer reflects batch-in-progress.

## Expected Behavior

`generatingAllStructures` remains true until all queued workout IDs for that batch have completed or failed (track pending set).

## Suggested Fix

- Maintain `pendingStructureWorkoutIds: Set<string>` for the batch.
- Clear global flag when set is empty.
- Handle partial batch failure (quota mid-batch already stops on first error).

## Acceptance Criteria

- [ ] Batch loading state covers full async duration
- [ ] User cannot accidentally double-trigger batch for same week while jobs run
