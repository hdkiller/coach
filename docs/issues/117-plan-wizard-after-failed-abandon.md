# 117 — Plan Wizard After Failed Abandon

**Type:** Bug  
**Priority:** Medium  
**Area:** `planning, ui/ux`  
**Status:** Open

## Description

app/pages/plan.vue

## Steps to Reproduce

Fail abandon API; wizard still opens while old plan active.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Only open wizard if abandon succeeds.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
