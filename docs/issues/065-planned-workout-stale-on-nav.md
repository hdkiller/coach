# 065 — Planned workout detail stale data on neighbor navigation

**Type:** Bug  
**Priority:** High  
**Area:** `workouts`, `planning`, `ui/ux`  
**Status:** Open

## Description

Neighbor chevrons navigate with `navigateTo('/workouts/planned/{neighbor.id}')`, but `fetchWorkout()` runs only in `onMounted`. Same component reuse leaves stale planned workout content after neighbor navigation.

## Steps to Reproduce

1. Open `/workouts/planned/{id-A}`.
2. Click next/previous neighbor chevron.
3. URL updates; header, date, and structure still show workout A.

## Expected Behavior

- Refetch when `:id` route param changes.

## Actual Behavior

- Stale content until reload.

## Affected Files

- `app/pages/workouts/planned/[id]/index.vue`

## Suggested Fix

Watch `route.params.id` and refetch; reset generation UI state on navigation.

## Acceptance Criteria

- [ ] Neighbor navigation shows correct planned workout
