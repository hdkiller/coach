# 089 — Planned Workout Error As Not Found

**Type:** UI  
**Priority:** Medium  
**Area:** `workouts, planning`  
**Status:** Open

## Description

app/pages/workouts/planned/[id]/index.vue

## Steps to Reproduce

Cause API 500 on planned workout fetch; page says Not Found.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Distinguish loadError from 404; show retry for server errors.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
