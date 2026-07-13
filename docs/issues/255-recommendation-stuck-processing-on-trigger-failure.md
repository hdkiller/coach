# 255 — NutritionRecommendation Stuck in PROCESSING When Trigger Enqueue Fails

**Type:** Bug  
**Priority:** Medium  
**Area:** `nutrition` (recommendations)  
**Status:** Open

## Description

`POST /api/nutrition/recommendations/meal` creates the `NutritionRecommendation` row
with `status: 'PROCESSING'` **before** calling `recommendNutritionMealTask.trigger()`.
If the trigger call throws (Trigger.dev outage, auth error), the handler bubbles a 500
and the row is left `PROCESSING` forever with `runId: null` — any UI/polling keyed on
that record waits indefinitely (same family as fixed issues 008/016 in the structure
tracker).

Related, in `trigger/recommend-nutrition-meal.ts`: on quota failure the task overwrites
`contextJson` with `{ error: 'QUOTA_EXCEEDED' }`, discarding the target/constraint
snapshot the record was created to hold.

## Affected Files

- `server/api/nutrition/recommendations/meal.post.ts`
- `trigger/recommend-nutrition-meal.ts`

## Acceptance Criteria

- Enqueue failure marks the recommendation `FAILED` (try/catch around `trigger`).
- Quota failure merges the error into `contextJson` instead of replacing it.
