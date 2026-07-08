# 112 — Map Gpx Download Silent Failure

**Type:** UI  
**Priority:** Medium  
**Area:** `workouts, ui/ux`  
**Status:** Open

## Description

app/pages/workouts/[id]/map.vue

## Steps to Reproduce

Download GPX for workout without GPS streams; no user feedback.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `server/api/workouts/[id]/export/gpx.get.ts`

## Suggested Fix

Toast on failure; use fetch+blob instead of raw anchor for error handling.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
