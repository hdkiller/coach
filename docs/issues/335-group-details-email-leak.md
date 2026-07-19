# 335 — Team group details API leaks member emails to any team member

**Priority:** High
**Type:** Security / Privacy
**Status:** Fixed
**Area:** `coaching, teams, privacy`

## Summary

`GET /api/coaching/groups/:id` allows any team member with `checkTeamAccess` (including ATHLETE role). `getGroupDetails` returns member emails. Team details sanitize emails for non-staff; group details do not.

## Steps to Reproduce

1. Athlete joins a team that has a group with other athletes.
2. Call `GET /api/coaching/groups/{groupId}` (or any UI that uses it).
3. Response includes other members' emails.

## Expected Behavior

Emails omitted for non-staff (consistent with roster masking / team details sanitization).

## Affected Files

- `server/api/coaching/groups/[id].get.ts`
- `server/utils/repositories/teamRepository.ts` — `getGroupDetails`

## Suggested Fix

Restrict GET to staff/group owner, and/or strip emails for non-staff viewers.

## Acceptance Criteria

- [ ] Athlete members cannot read other athletes' emails via group API
- [ ] Staff still see emails when appropriate


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
