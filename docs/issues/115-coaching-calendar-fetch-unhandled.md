# 115 — Coaching Calendar Fetch Unhandled

**Type:** Bug  
**Priority:** Medium  
**Area:** `coaching, ui/ux`  
**Status:** Open

## Description

app/pages/coaching/calendar.vue

## Steps to Reproduce

Click stale calendar activity after delete; no error toast.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Wrap fetches in try/catch with user feedback.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
