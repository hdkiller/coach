# 122 — Workout Comparison Fetch Failure Hidden

**Type:** UI  
**Priority:** Medium  
**Area:** `analytics, workouts`  
**Status:** Open

## Description

app/pages/analytics/workout-comparison.vue

## Steps to Reproduce

Persist selected IDs but fail workouts POST; shows Build a basket empty state.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Show fetch error with retry when selection load fails.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
