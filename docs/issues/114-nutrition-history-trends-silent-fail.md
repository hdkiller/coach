# 114 — Nutrition History Trends Silent Fail

**Type:** UI  
**Priority:** Medium  
**Area:** `nutrition, ui/ux`  
**Status:** Open

## Description

app/pages/nutrition/history.vue

## Steps to Reproduce

Fail /api/scores/nutrition-trends; score cards and charts vanish silently.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Show error banner with retry.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
