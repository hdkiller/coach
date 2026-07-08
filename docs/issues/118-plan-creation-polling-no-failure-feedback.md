# 118 — Plan Creation Polling No Failure Feedback

**Type:** UI  
**Priority:** Medium  
**Area:** `planning, ui/ux`  
**Status:** Open

## Description

app/pages/plan.vue

## Steps to Reproduce

Complete wizard; generation fails; polling ends silently with empty dashboard.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Toast failure state when max attempts reached without workouts.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
