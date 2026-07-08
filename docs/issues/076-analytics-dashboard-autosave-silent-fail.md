# 076 — Analytics Dashboard Autosave Silent Fail

**Type:** Bug  
**Priority:** High  
**Area:** `ui/ux, analytics`  
**Status:** Open

## Description

app/pages/analytics/index.vue

## Steps to Reproduce

Change dashboard layout while API save fails; reload page — changes lost with no toast.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Toast on save failure; optional rollback of local state.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
