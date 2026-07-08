# 132 — Feed Sport Filter Wrong Type

**Type:** Bug  
**Priority:** Medium  
**Area:** `dashboard, ui/ux`  
**Status:** Fixed

## Description

Sport USelectMenu missing value-attribute; selectedSport may be object breaking API type query.

## Steps to Reproduce

Select sport filter; inspect /api/workouts type param.

## Expected Behavior

- Correct behavior per area; errors surfaced to user; auth/privacy enforced.

## Actual Behavior

- See description.

## Affected Files

- `app/pages/feed.vue`

## Acceptance Criteria

- [x] Issue no longer reproducible
- [x] Regression covered where practical
