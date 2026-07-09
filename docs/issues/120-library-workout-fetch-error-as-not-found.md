# 120 — Library Workout Fetch Error As Not Found

**Type:** UI  
**Priority:** Medium  
**Area:** `workouts, planning`  
**Status:** Fixed

## Description

app/pages/library/workouts/[id].vue

## Steps to Reproduce

Cause 500 on template fetch; shows Not Found.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Distinguish error vs missing template.

## Acceptance Criteria

- [x] Bug no longer reproducible via steps above
- [x] Appropriate error handling or auth in place
