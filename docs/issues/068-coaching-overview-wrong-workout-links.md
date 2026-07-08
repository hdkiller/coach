# 068 — Coaching Overview Wrong Workout Links

**Type:** Bug  
**Priority:** High  
**Area:** `coaching, ui/ux`  
**Status:** Open

## Description

server/api/coaching/overview.get.ts

## Steps to Reproduce

Coach opens /coaching, clicks athlete workout in feed, navigates to coach-scoped /workouts/{id} which fails.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `app/components/coaching/ActivityFeed.vue`

## Suggested Fix

Link to `/api/coaching/athletes/{id}/workouts/{workoutId}` or athlete-context route.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
