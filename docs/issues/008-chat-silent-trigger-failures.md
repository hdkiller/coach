# 008 — Chat tools swallow structure trigger failures

**Type:** Bug  
**Priority:** High  
**Area:** `ai`, `backend`, `workouts`  
**Status:** Open

## Description

When chat planning tools create or update a planned workout and fail to enqueue structure generation, the error is logged but the tool still returns `{ success: true }` with a message implying generation started.

## Location

```910:937:server/utils/ai-tools/planning.ts
        try {
          const handle = await generateStructuredWorkoutTask.trigger(...)
          ...
          runId = handle.id
        } catch (e) {
          console.error('Failed to trigger structured workout generation:', e)
        }

      return {
        success: true,
        workout_id: workout.id,
        message: 'Planned workout created and structured generation started.'
      }
```

Same pattern in `update_planned_workout` (~1015–1017).

## Impact

- User sees chat confirmation that structure generation started.
- Workout exists with no structure and no background job.
- Hard to diagnose without server logs.

## Expected Behavior

- If trigger fails: return `{ success: false, error: '...' }` or `{ success: true, workout_id, structure_generation: 'failed', error: '...' }`.
- Chat assistant should communicate the partial success clearly.

## Suggested Fix

1. Propagate trigger errors to tool return value.
2. Optionally still create the workout but flag `structurePending: true` with failed enqueue for retry UI.

## Related

- Chat correctly uses async triggers (good pattern) — failure visibility is the gap.
- [012](./012-ai-in-triggers-architecture-rethink.md)

## Acceptance Criteria

- [ ] Trigger enqueue failure is visible in chat tool result
- [ ] Assistant message reflects partial vs full success
