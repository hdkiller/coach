# 026 — `generate_planned_workout_structure` / `adjust_planned_workout` skip sync existence check

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai`, `backend`, `workouts`  
**Status:** Open

## Description

Both tools enqueue Trigger.dev jobs without verifying the workout exists and belongs to the user. Chat returns `{ success: true, run_id }`; the task fails asynchronously.

## Root Cause

No `plannedWorkoutRepository.getById` preflight before trigger in `planning.ts` (~1169–1225). Contrast `patch_planned_workout_structure` (~737) which checks existence first.

## Impact

- Hallucinated `workout_id` → chat card shows “Job running”, task fails with “Workout not found”.
- Wastes queue time; poor error UX vs synchronous `{ success: false }`.

## Acceptance Criteria

- [ ] Invalid/missing workout_id returns synchronous error in chat tool result
- [ ] No Trigger run enqueued for non-existent workouts
