# 048 — Recovery History page ignores fetch errors

**Type:** UI  
**Priority:** Medium  
**Area:** `wellness`, `ui/ux`, `recovery`  
**Status:** Fixed

## Description

`useRecoveryContext` exposes `error` and `pending`, but the Recovery History page only renders `filteredItems` with no loading skeleton or error alert. A failed `/api/recovery-context` request looks like an empty history with no retry path.

## Root Cause

`app/pages/recovery/index.vue` does not bind to `error` or `pending` from `useRecoveryContext`.

## Steps to Reproduce

1. Open `/recovery`.
2. Block or fail `/api/recovery-context`.
3. Page shows empty timeline with no error message or retry.

## Expected Behavior

- Loading skeleton while fetching.
- Error banner with retry when fetch fails.

## Actual Behavior

- Failed fetch indistinguishable from empty history.

## Affected Files

- `app/pages/recovery/index.vue`
- `app/composables/useRecoveryContext.ts`

## Suggested Fix

Render `pending` skeleton and `error` alert with retry button that calls `refresh()`.

## Acceptance Criteria

- [x] Loading state visible during fetch
- [x] Error state with retry on failure
- [x] Empty state only when fetch succeeds with zero items
