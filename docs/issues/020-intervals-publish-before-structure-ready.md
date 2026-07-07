# 020 — Chat publishes Intervals shell before structure exists

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations`, `workouts`, `ai`  
**Status:** Open

## Description

Chat `create_planned_workout` uploads a **structure-less shell** to Intervals.icu immediately, then async generation fills structure later via UPDATE. Users and devices can see an empty workout during the gap; chat may also call `publish_planned_workout` before structure exists.

## Root Causes

### Early Intervals CREATE (no `workout_doc`)

```893:905:server/utils/ai-tools/planning.ts
      await autoUploadPlannedWorkoutToIntervalsIfEnabled({ ... })

      if (args.generate_structure !== false) {
        ... generateStructuredWorkoutTask.trigger(...)
```

`autoUploadPlannedWorkoutToIntervalsIfEnabled` (`intervals-sync.ts` ~190–205) sends CREATE without interval steps.

Generation task later runs UPDATE when `syncStatus === 'SYNCED'` (else branch ~1863+ in `generate-structured-workout.ts`) — this works but leaves a window with empty Intervals content.

### `publish_planned_workout` allows empty `workout_doc`

```1279:1308:server/utils/ai-tools/planning.ts
      let workoutDoc = ''
      if (workout.structuredWorkout) {
        workoutDoc = WorkoutConverter.toIntervalsICU(workoutData)
      }
      ...
            workout_doc: workoutDoc,
```

No guard requiring renderable structure before publish.

## Impact

- Intervals shows metadata-only workout while chat card still “generating”.
- Model may chain `create` → `publish` in one turn → permanent empty export if generation fails.
- User perception: “workout created but no details in Intervals.”

## Suggested Fix

- Defer Intervals CREATE until structure ready (or single CREATE with structure).
- Reject `publish_planned_workout` when `!hasRenderableStructure(workout)`.
- Skill instruction: do not publish until structure job completes.

## Acceptance Criteria

- [ ] Chat-created workouts do not appear empty on Intervals during normal flow
- [ ] Publish tool fails clearly when structure missing
