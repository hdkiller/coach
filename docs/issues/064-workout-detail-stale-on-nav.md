# 064 — Workout detail page does not reload when navigating between workouts

**Type:** Bug  
**Priority:** High  
**Area:** `workouts`, `ui/ux`  
**Status:** Open

## Description

Prev/next navigation calls `navigateTo('/workouts/{otherId}')`, but `fetchWorkout()` runs only in `onMounted`. Vue Router reuses the same page component when only `:id` changes, so the UI can show the previous workout while the URL updates.

## Root Cause

`app/pages/workouts/[id]/index.vue` — `onMounted(() => fetchWorkout())` with no `watch` on `route.params.id`.

## Steps to Reproduce

1. Open `/workouts/{id-A}` and wait for load.
2. Click chevron to navigate to next workout.
3. URL changes to `{id-B}` but title, scores, and analysis still reflect workout A.

## Expected Behavior

- Data refetches when route `id` param changes.

## Actual Behavior

- Stale workout content until full page reload.

## Affected Files

- `app/pages/workouts/[id]/index.vue`

## Suggested Fix

`watch(() => route.params.id, () => fetchWorkout())` or `onBeforeRouteUpdate`.

## Acceptance Criteria

- [ ] Neighbor navigation loads correct workout data
- [ ] Loading state shown during refetch
