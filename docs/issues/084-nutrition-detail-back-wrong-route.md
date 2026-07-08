# 084 — Nutrition Detail Back Wrong Route

**Type:** UI  
**Priority:** Medium  
**Area:** `nutrition, ui/ux`  
**Status:** Open

## Description

app/pages/nutrition/[id].vue

## Steps to Reproduce

Open nutrition day detail, click Back; lands on activities list.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Change to to=/nutrition/history or /nutrition.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
