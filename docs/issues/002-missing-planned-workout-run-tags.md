# 002 — Manual/API triggers missing `planned-workout:` run tags

**Type:** Bug  
**Priority:** High  
**Area:** `ui/ux`, `backend`, `workouts`  
**Status:** Open

## Description

The Planned Workout Details page tracks in-progress structure jobs by matching Trigger.dev runs tagged with `planned-workout:${workoutId}`. Several entry points only tag runs with `user:${userId}`, so the UI cannot detect active generation for workouts triggered through those paths.

## Root Cause

The details page filters active runs like this:

```1453:1464:app/pages/workouts/planned/[id]/index.vue
  const activeStructureRun = computed(() => {
    const workoutId = workout.value?.id
    if (!workoutId) return null

    return (
      runs.value.find((run) => {
        return (
          STRUCTURE_TASK_IDENTIFIERS.has(run.taskIdentifier) &&
          Array.isArray(run.tags) &&
          run.tags.includes(`planned-workout:${workoutId}`)
        )
      }) || null
    )
  })
```

But the primary manual API only tags the user:

```78:86:server/api/workouts/planned/[id]/generate-structure.post.ts
    const handle = await tasks.trigger(
      'generate-structured-workout',
      { plannedWorkoutId: id },
      {
        concurrencyKey: userId,
        tags: [`user:${userId}`]
      }
    )
```

Chat planning tools **do** include the correct tag (`server/utils/ai-tools/planning.ts` lines ~917, 1007).

## Affected Trigger Sites (missing `planned-workout:` tag)

| File | Task |
|------|------|
| `server/api/workouts/planned/[id]/generate-structure.post.ts` | `generate-structured-workout` |
| `server/api/workouts/planned/[id]/adjust.post.ts` | `adjust-structured-workout` |
| `server/api/recommendations/[id]/accept.post.ts` | `generate-structured-workout` |
| `trigger/generate-training-block.ts` (~638–643) | `generate-structured-workout` (batch loop) |
| `trigger/generate-ad-hoc-workout.ts` (~224–232) | `generate-structured-workout` |

## Steps to Reproduce

1. Open a planned workout details page.
2. Click **Build Structure** (uses `generate-structure.post.ts`).
3. While generation is running, observe the page — no "Structure generation running" badge from `activeStructureRun`.
4. Compare with creating a workout via chat (which does show run tracking when tags are present).

## Expected Behavior

All structure generation entry points tag runs with `planned-workout:${id}` so the UI can show consistent in-progress state.

## Actual Behavior

Manual Build Structure, Adjust, recommendation accept, training block batch, and ad-hoc flows do not tag per-workout runs. UI status indicators and `activeStructureRun` are unreliable for the most common user action.

## Suggested Fix

1. Standardize tags: `[`user:${userId}`, `planned-workout:${workoutId}`]` for all planned workout structure tasks.
2. Pass the same tags to `publishTaskRunStartedEvent` where applicable.
3. Add a small helper e.g. `structureRunTags(userId, plannedWorkoutId)` to avoid drift.

## Related

- [004](./004-no-task-failure-handling.md) — failure handling on same page
- [005](./005-page-reload-loses-generation-state.md) — state recovery depends on run visibility

## Acceptance Criteria

- [ ] Every `generate-structured-workout` / `adjust-structured-workout` trigger from API and nested tasks includes `planned-workout:` tag
- [ ] Planned Workout Details page shows in-progress badge for Build Structure
- [ ] Unit or integration test asserts tag presence on API trigger
