# 338 — No in-app/email notifications for coaching connect / request lifecycle

**Priority:** Medium
**Type:** Gap
**Status:** Fixed
**Area:** `coaching, notifications`

## Summary

`createUserNotification` exists but coaching flows never call it. No emails for start-page request, approve, decline, or new connection. Coaches discover requests only by opening Athletes; athletes get silence after Start submit / approval.

## Evidence

- `server/utils/notifications.ts` — unused by coaching APIs
- Pending requests UI only on `/coaching/athletes`
- No athlete pending-request status UI

## Suggested Fix

Notify coach on new Start request; notify athlete on approve/decline; optional nav badge / Overview CTA (see 340).

## Acceptance Criteria

- [ ] Coach learns of a new Start request without opening Athletes
- [ ] Athlete learns of approve/decline outcome


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
