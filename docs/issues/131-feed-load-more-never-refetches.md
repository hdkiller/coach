# 131 — Feed Load More Never Refetches

**Type:** Bug  
**Priority:** High  
**Area:** `dashboard, activities`  
**Status:** Open

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

- [ ] Issue no longer reproducible
- [ ] Regression covered where practical
