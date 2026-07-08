# 042 — Today’s workouts/recommendations skipped for non-Intervals users

**Type:** Bug  
**Priority:** Medium  
**Area:** `dashboard`, `planning`, `integrations`  
**Status:** Open

## Description

`fetchTodayWorkout()` and `fetchTodayRecommendation()` return immediately when `intervalsConnected` is false, even if the user has planned workouts from Strava, Garmin, WHOOP, or in-app planning. The dashboard training card can appear empty with no explanation.

## Root Cause

```20:20:app/stores/recommendations.ts
    if (!integrationStore.intervalsConnected) return
```

Same guard exists in `fetchTodayRecommendation()`.

## Steps to Reproduce

1. Connect Strava (or another non-Intervals integration) with planned workouts.
2. Do not connect Intervals.icu.
3. Open Dashboard.
4. Today’s Training card shows no workouts despite data existing.

## Expected Behavior

- Dashboard shows today’s planned workouts from any connected source.
- If no data, show an explanatory empty state (not silent skip).

## Actual Behavior

- Fetch functions no-op when Intervals is disconnected.
- Card appears empty without messaging.

## Affected Files

- `app/stores/recommendations.ts`
- `app/components/dashboard/TrainingRecommendationCard.vue`

## Suggested Fix

Fetch today’s workouts from the app’s planned-workout API regardless of Intervals connection. Use Intervals only for sync-specific recommendation logic if needed.

## Acceptance Criteria

- [ ] Non-Intervals users see today’s planned workouts on dashboard
- [ ] Empty state explains why no workouts are shown when truly empty
