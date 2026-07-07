# 016 — Chat card polls forever when structure enqueue fails without `run_id`

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux`, `workouts`  
**Status:** Open

## Description

If `create_planned_workout` or `update_planned_workout` returns `success: true` but no `run_id` (trigger swallowed per [008](./008-chat-silent-trigger-failures.md)), `ChatPlannedWorkoutCard` shows perpetual **“Waiting for structured workout”** with no timeout or failure state.

## Root Cause

```242:248:app/components/chat/ChatPlannedWorkoutCard.vue
  const isOperationComplete = computed(() => {
    ...
    if (expectsStructure.value && !hasVisualization.value) return false
```

Workout polling continues while structure is expected but missing (lines 487–491), with no max duration and no terminal path when `run_id` is absent.

## Expected Behavior

- Missing `run_id` + elapsed time + empty structure → show failure, not infinite spinner.
- Surface enqueue error from tool result when [008](./008-chat-silent-trigger-failures.md) is fixed.

## Acceptance Criteria

- [ ] Card stops polling after bounded time or explicit failure
- [ ] User sees actionable error instead of endless “Waiting…”
