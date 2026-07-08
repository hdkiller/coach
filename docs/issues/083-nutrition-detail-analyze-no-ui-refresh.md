# 083 — Nutrition Detail Analyze No Ui Refresh

**Type:** Bug  
**Priority:** Medium  
**Area:** `nutrition, ui/ux`  
**Status:** Open

## Description

app/pages/nutrition/[id].vue

## Steps to Reproduce

Click Refresh under Coach Analysis; wait for task complete; section stale until reload.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Register onTaskCompleted('analyze-nutrition') and refetch.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
