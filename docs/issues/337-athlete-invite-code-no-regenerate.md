# 337 — Athlete personal invite code cannot be regenerated while active

**Priority:** Medium
**Type:** UX
**Status:** Fixed
**Area:** `coaching, invites`

## Summary

After generating a personal "Invite a Coach" code, the Team page only shows the code + expiry. There is no Regenerate/Revoke control until the code expires (7 days), even though `createInvite` already expires prior pending codes server-side.

## Evidence

- `app/pages/coaching/team/index.vue` — Generate button only when `!invite.code`
- `server/utils/repositories/coachingRepository.ts` — `createInvite` expires old PENDING invites

## Suggested Fix

Add "Regenerate code" / "Revoke" that POSTs `/api/coaching/invite` again (existing behavior).

## Acceptance Criteria

- [ ] Athlete can invalidate an exposed code and issue a new one immediately


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
