# 024 — Chat card fuzzy workout ID fallback can attach to wrong workout

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux`, `workouts`  
**Status:** Open

## Description

When `create_planned_workout` response lacks `workout_id`, `ChatPlannedWorkoutCard` guesses the workout by scoring same-day candidates on title/type/duration — which can bind polling and display to the **wrong workout**.

## Root Cause

```387:445:app/components/chat/ChatPlannedWorkoutCard.vue
  const resolveWorkoutIdFromCreateArgs = async () => {
    ...
      const byScore = [...workouts].map((w) => { let score = 0; ... })
      const best = byScore[0]?.workout
      if (best?.id) {
        fallbackWorkoutId.value = best.id
      }
```

## Reproduction

Two runs on the same calendar day → card without explicit `workout_id` polls/displays highest-scoring unrelated workout’s structure status.

## Suggested Fix

Only use explicit `workout_id` / `run_id`; show error state instead of guessing. Fix upstream ([008](./008-chat-silent-trigger-failures.md), [014](./014-idempotent-create-skips-structure-retrigger.md)) so `workout_id` is always returned.

## Acceptance Criteria

- [ ] Card never attaches to wrong workout via heuristic matching
- [ ] Missing id shows clear error, not misleading progress
