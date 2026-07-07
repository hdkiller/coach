# 005 — Page reload does not restore in-progress generation UI

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux`, `workouts`  
**Status:** Open

## Description

If a user reloads the Planned Workout Details page while structure generation is in progress, the UI does not restore the generating state. The `generating` ref defaults to `false` and `onMounted` only calls `fetchWorkout()` — it does not sync from active Trigger.dev runs.

## Root Cause

```2546:2550:app/pages/workouts/planned/[id]/index.vue
  onMounted(() => {
    trackWorkoutViewDetail('planned')
    fetchWorkout()
    fetchIntegrationStatus()
  })
```

`activeStructureRun` computed property exists but is **not** used to initialize `generating.value` or `adjusting.value`.

Combined with [002](./002-missing-planned-workout-run-tags.md), manual Build Structure runs may not appear in `activeStructureRun` at all, making recovery impossible even if sync logic were added.

## Expected Behavior

On mount (and when `runs` updates):

1. If `activeStructureRun` exists for this workout → set `generating` or `adjusting` accordingly.
2. Show "Structure generation running" badge (already wired to `activeStructureRun` / `structureJobStatusLabel`).

## Suggested Fix

```typescript
watch(activeStructureRun, (run) => {
  if (!run) {
    // Don't clear generating here — wait for completion/failure handlers
    return
  }
  if (run.taskIdentifier === 'adjust-structured-workout') adjusting.value = true
  else generating.value = true
}, { immediate: true })
```

Requires [002](./002-missing-planned-workout-run-tags.md) for manual API paths.

## Acceptance Criteria

- [ ] Reload during chat-triggered generation shows in-progress state
- [ ] Reload during manual generation shows in-progress state (after tag fix)
