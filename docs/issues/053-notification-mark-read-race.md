# 053 — Notification click navigates before read state is persisted

**Type:** Bug  
**Priority:** Low  
**Area:** `ui/ux`, `notifications`  
**Status:** Open

## Description

`handleNotificationClick` calls `markAsRead(id)` without awaiting it, then immediately `navigateTo(link)`. If navigation unmounts the page quickly or the PATCH fails, the notification may remain unread in the server and dropdown badge.

## Root Cause

Fire-and-forget `markAsRead` before navigation in `app/pages/notifications.vue` and `app/components/NotificationDropdown.vue`.

## Steps to Reproduce

1. Click a notification with a link on slow network.
2. Destination opens immediately.
3. Return to notifications — same item may still show as unread.

## Expected Behavior

- Read state persisted before navigation, or navigation waits for PATCH.

## Actual Behavior

- Race between mark-as-read and route change.

## Affected Files

- `app/pages/notifications.vue`
- `app/components/NotificationDropdown.vue`
- `app/stores/notifications.ts`

## Suggested Fix

`await markAsRead(id)` before `navigateTo`, or use optimistic update with background sync.

## Acceptance Criteria

- [ ] Clicked notifications marked read reliably
- [ ] Badge count updates after click
