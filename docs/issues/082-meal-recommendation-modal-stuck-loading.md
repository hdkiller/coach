# 082 — Meal Recommendation Modal Stuck Loading

**Type:** Bug  
**Priority:** Medium  
**Area:** `nutrition, ui/ux`  
**Status:** Fixed

## Description

app/components/nutrition/MealRecommendationModal.vue

## Steps to Reproduce

Fail recommend-nutrition-meal task; modal spinner never stops.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Add onTaskFailed and terminal error state.

## Acceptance Criteria

- [x] Bug no longer reproducible via steps above
- [x] Appropriate error handling or auth in place
