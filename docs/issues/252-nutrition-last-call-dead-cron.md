# 252 — `nutrition-last-call` Cron Runs Every 30 Minutes Only to Return Immediately

**Type:** Maintenance  
**Priority:** Low  
**Area:** `nutrition` (trigger tasks)  
**Status:** Open

## Description

`trigger/nutrition-last-call.ts` is a `schedules.task` with `cron: '0,30 * * * *'`
whose body starts with:

```ts
console.log('Nutrition Last Call trigger is currently disabled.')
return
```

48 no-op runs per day forever, plus ~70 lines of unreachable code below the `return`
that has its own problems if ever re-enabled (queries **all users'** planned workouts
with no per-user notification opt-in check, compares `plannedWorkout.date` — often a
date-only value — against wall-clock windows, and creates `systemMessage` rows in a
loop).

Either remove the schedule until the feature ships, or finish it behind a user setting.

## Affected Files

- `trigger/nutrition-last-call.ts`

## Acceptance Criteria

- No recurring scheduled runs for a disabled feature; unreachable code removed or the
  feature completed with opt-in gating.
