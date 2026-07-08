# 080 — Plan Dashboard Tasks No Ontaskfailed

**Type:** Bug  
**Priority:** Medium  
**Area:** `planning, ui/ux`  
**Status:** Open

## Description

app/components/plans/PlanDashboard.vue

## Steps to Reproduce

Fail generate-training-block; generatingWorkouts/generatingBlockId stuck.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Add onTaskFailed for all registered task types.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
