# 133 — Feed Errors Empty State

**Type:** UI  
**Priority:** Medium  
**Area:** `dashboard, ui/ux`  
**Status:** Fixed

## Description

Feed API failure shows empty feed not error state.

## Steps to Reproduce

Block /api/workouts; empty state with no error.

## Expected Behavior

- Correct behavior per area; errors surfaced to user; auth/privacy enforced.

## Actual Behavior

- See description.

## Affected Files

- `app/pages/feed.vue`

## Acceptance Criteria

- [x] Issue no longer reproducible
- [x] Regression covered where practical
