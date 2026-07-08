# 052 — Notification errors swallowed with no user feedback

**Type:** UI  
**Priority:** Medium  
**Area:** `ui/ux`, `notifications`  
**Status:** Open

## Description

`fetchNotifications`, `markAsRead`, and `markAllAsRead` catch errors and only `console.error`. The notifications page and dropdown show empty or stale data with no error banner or toast when the API fails.

## Root Cause

`app/stores/notifications.ts` error paths log to console only; consuming components do not surface `error` state.

## Steps to Reproduce

1. Open notifications while `/api/notifications` returns 500.
2. Page shows “All caught up” or stale list.
3. No error message displayed.

## Expected Behavior

- Error banner or toast when notification API fails.
- Retry action available.

## Actual Behavior

- Silent failure; misleading empty state.

## Affected Files

- `app/stores/notifications.ts`
- `app/pages/notifications.vue`
- `app/components/NotificationDropdown.vue`

## Suggested Fix

Expose `error` and `pending` from store; render error UI in page and dropdown.

## Acceptance Criteria

- [ ] API failures show user-visible error
- [ ] Retry refetches notifications
