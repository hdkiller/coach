# 088 — Workout Matcher Silent Link Errors

**Type:** UI  
**Priority:** Medium  
**Area:** `workouts, activities`  
**Status:** Open

## Description

app/components/workouts/WorkoutMatcher.vue

## Steps to Reproduce

Link workouts on different days; no feedback shown.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `server/api/workouts/[id]/link.post.ts`

## Suggested Fix

Toast API error message to user.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
