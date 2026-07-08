# 041 — Workout comparison basket persists across logins

**Type:** Bug  
**Priority:** High  
**Area:** `ui/ux`, `analytics`, `workouts`  
**Status:** Open

## Description

Selected workout IDs and comparison snapshots are stored in global `localStorage` keys with no user scoping and no cleanup on logout. A second user on the same browser can see stale workout IDs and titles from the previous account.

## Root Cause

`app/stores/workout-comparison.ts` uses:

- `workout-comparison:selected-ids`
- `workout-comparison:snapshots`

`app/composables/useAppLogout.ts` does not clear these keys on logout.

## Steps to Reproduce

1. User A adds workouts to the comparison basket.
2. User A logs out.
3. User B logs in on the same browser.
4. Open comparison dock or `/analytics/workout-comparison`.
5. Previous user’s selections appear.

## Expected Behavior

- Comparison state is scoped per user or cleared on logout/login.
- Wrong-user workout IDs never appear.

## Actual Behavior

- Stale cross-account data persists in localStorage.

## Affected Files

- `app/stores/workout-comparison.ts`
- `app/composables/useAppLogout.ts`
- `app/components/workouts/WorkoutComparisonDock.vue`

## Suggested Fix

Prefix storage keys with `userId`, or clear comparison store in logout flow.

## Acceptance Criteria

- [ ] Logout clears comparison basket
- [ ] New login starts with empty basket
- [ ] Same-browser multi-user scenario shows correct data per account
