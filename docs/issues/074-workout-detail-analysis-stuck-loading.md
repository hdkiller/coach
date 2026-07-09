# 074 — Workout Detail Analysis Stuck Loading

**Type:** Bug  
**Priority:** High  
**Area:** `workouts, ui/ux`  
**Status:** Fixed

## Description

app/pages/workouts/[id]/index.vue

## Steps to Reproduce

Trigger analyze-workout, let task fail; spinner persists.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Add onTaskFailed for analyze-workout and analyze-plan-adherence.

## Acceptance Criteria

- [x] Bug no longer reproducible via steps above
- [x] Appropriate error handling or auth in place
