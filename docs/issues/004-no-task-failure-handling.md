# 004 — No `onTaskFailed` handler — stuck "Generating..." state

**Type:** Bug  
**Priority:** High  
**Area:** `ui/ux`, `workouts`  
**Status:** Open

## Description

The Planned Workout Details page sets `generating.value = true` when starting structure generation but only clears it in `onTaskCompleted`. There is no `onTaskFailed` handler for `generate-structured-workout` or `adjust-structured-workout`.

If a Trigger.dev run **FAILS**, **TIMED_OUT** (180s task cap), or is **CANCELLED**, the Build Structure button can remain stuck on **"Generating..."** until the user reloads the page.

## Root Cause

```1379:1407:app/pages/workouts/planned/[id]/index.vue
  onTaskCompleted('generate-structured-workout', async (run) => {
    await fetchWorkout()
    generating.value = false
    ...
  })
  // No onTaskFailed registered
```

Compare with `app/pages/profile/goals.vue`, which registers both `onTaskCompleted` and `onTaskFailed` for its tasks.

`useUserRunsState()` exposes `onTaskFailed` (`app/composables/useUserRuns.ts` ~421).

## Steps to Reproduce

1. Start structure generation on a complex workout (or simulate a failing trigger run).
2. Let the Trigger.dev task fail or time out at 180s.
3. Observe the UI — button stays in loading state.

## Expected Behavior

- On task failure/timeout/cancel: clear `generating` / `adjusting`, show error toast with actionable message.
- Optionally link to developer run logs for support.

## Suggested Fix

```typescript
onTaskFailed('generate-structured-workout', async (run) => {
  generating.value = false
  toast.add({ title: 'Generation Failed', description: '...', color: 'error' })
})
onTaskFailed('adjust-structured-workout', async (run) => {
  adjusting.value = false
  ...
})
```

Filter failures by `planned-workout:${id}` tag once [002](./002-missing-planned-workout-run-tags.md) is fixed.

## Related

- [002](./002-missing-planned-workout-run-tags.md)
- [012](./012-ai-in-triggers-architecture-rethink.md) — timeout failures at task level

## Acceptance Criteria

- [ ] Failed/timed-out structure runs reset UI loading state
- [ ] User sees error feedback without requiring page reload
