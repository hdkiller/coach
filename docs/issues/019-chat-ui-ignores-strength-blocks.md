# 019 — Chat UI treats blocks-only strength structures as “no structure”

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux`, `workouts`  
**Status:** Open  
**Related:** [011](./011-strength-blocks-validation-gap.md) (backend validation)

## Description

`ChatPlannedWorkoutCard` and `ChatMessageContent` only check `steps` and `exercises` when deciding if a workout has structure. Canonical strength **`blocks`** are ignored.

## Root Cause

```146:152:app/components/chat/ChatPlannedWorkoutCard.vue
    return (
      (Array.isArray(structured.steps) && structured.steps.length > 0) ||
      (Array.isArray(structured.exercises) && structured.exercises.length > 0)
    )
```

Same in `ChatMessageContent.vue` (~127–130).

## Impact

Chat-generated WeightTraining with valid `blocks` stays on **“Waiting for structured workout”** even after generation completes.

## Suggested Fix

Shared `hasRenderableStructure()` helper including `blocks[].steps` (align with `structured-workout-persistence.ts`).

## Acceptance Criteria

- [ ] Strength blocks-only workouts show as complete in chat cards
- [ ] Mini chart / step preview works or shows appropriate strength UI
