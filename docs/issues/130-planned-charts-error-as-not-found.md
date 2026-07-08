# 130 — Planned Charts Error As Not Found

**Type:** UI  
**Priority:** Medium  
**Area:** `workouts, planning`  
**Status:** Open

## Description

app/pages/workouts/planned/[id]/charts.vue

## Steps to Reproduce

Fail planned workout API on charts page; shows not found.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Add error/retry state distinct from 404.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
