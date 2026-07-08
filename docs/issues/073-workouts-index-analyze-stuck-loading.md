# 073 — Workouts Index Analyze Stuck Loading

**Type:** Bug  
**Priority:** High  
**Area:** `workouts, ui/ux`  
**Status:** Fixed

## Description

app/pages/workouts/index.vue

## Steps to Reproduce

Fail analyze-workout or generate-score-explanations task; buttons stay loading.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Add onTaskFailed handlers (same pattern as 039/049).

## Acceptance Criteria

- [x] Bug no longer reproducible via steps above
- [x] Appropriate error handling or auth in place
