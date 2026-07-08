# 131 — Feed Load More Never Refetches

**Type:** Bug  
**Priority:** High  
**Area:** `dashboard, activities`  
**Status:** Fixed

## Description

Feed Load Older Activities increments offset but useFetch watch omits offset so no refetch happens.

## Steps to Reproduce

Click Load Older Activities on /feed; no new API request.

## Expected Behavior

- Correct behavior per area; errors surfaced to user; auth/privacy enforced.

## Actual Behavior

- See description.

## Affected Files

- `app/pages/feed.vue`

## Acceptance Criteria

- [x] Issue no longer reproducible
- [x] Regression covered where practical
