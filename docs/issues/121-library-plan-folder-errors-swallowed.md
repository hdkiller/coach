# 121 — Library Plan Folder Errors Swallowed

**Type:** UI  
**Priority:** Medium  
**Area:** `planning, workouts`  
**Status:** Open

## Description

app/pages/library/plans/index.vue

## Steps to Reproduce

Fail folder create API; modal stays open with no message.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Add catch with error toast like workout library.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
