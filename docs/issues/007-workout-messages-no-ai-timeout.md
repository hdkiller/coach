# 007 — `generate-workout-messages` has no explicit AI timeout

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai`, `backend`, `workouts`  
**Status:** Open

## Description

The coaching messages trigger calls `generateStructuredAnalysis` without `timeoutMs`, while the main structure generation tasks use a 45s per-attempt timeout. The task `maxDuration` is 300s, so a hung AI call could consume most of the task budget with default SDK retry behavior.

## Location

```76:86:trigger/generate-workout-messages.ts
    const result = await generateStructuredAnalysis<{ messages: any[] }>(
      prompt,
      messageGenerationSchema,
      'flash',
      {
        userId: workout.userId,
        operation: 'generate_workout_messages',
        entityType: 'PlannedWorkout',
        entityId: plannedWorkoutId
      }
    )
```

Compare with `generate-structured-workout.ts` which passes `timeoutMs: 45_000` and `maxRetries: 0`.

## Expected Behavior

All workout-related AI operations in triggers should use consistent, explicit timeouts aligned with [012](./012-ai-in-triggers-architecture-rethink.md).

## Suggested Fix

Pass `timeoutMs: 45_000` (or a dedicated constant) and `maxRetries: 0` with optional single manual retry.

## Acceptance Criteria

- [ ] `generate-workout-messages` cannot hang indefinitely within a 300s task
- [ ] Timeout failures surface as task failure with user-visible error on details page
