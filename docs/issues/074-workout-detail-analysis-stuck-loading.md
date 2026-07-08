# 074 — Workout Detail Analysis Stuck Loading

**Type:** Bug  
**Priority:** High  
**Area:** `workouts, ui/ux`  
**Status:** Open

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

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
