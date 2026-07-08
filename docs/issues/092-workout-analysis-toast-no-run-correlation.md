# 092 — Workout Analysis Toast No Run Correlation

**Type:** Bug  
**Priority:** Medium  
**Area:** `workouts, ai`  
**Status:** Open

## Description

app/pages/workouts/[id]/index.vue

## Steps to Reproduce

Analyze workout A while viewing workout B; B shows Analysis Complete toast.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `app/pages/workouts/index.vue`

## Suggested Fix

Tag runs with workout:id or filter completion by enqueued runId.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
