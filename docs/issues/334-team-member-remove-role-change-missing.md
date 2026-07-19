# 334 — No team member remove or role-change UI/API

**Priority:** High
**Type:** Gap
**Status:** Fixed
**Area:** `coaching, teams`

## Summary

`teamRepository` can remove/add members, but there is no HTTP route or UI to remove a member or change roles. Staff tab is display-only. Athletes cannot leave a team. Wrong role or departed members require manual DB work.

## Evidence

- `server/utils/repositories/teamRepository.ts` — `removeTeamMember` / add helpers
- No `server/api/coaching/teams/[id]/members/...` delete or role PATCH
- `app/pages/coaching/teams/[id].vue` Staff tab — avatar + badge only

## Suggested Fix

- OWNER/ADMIN: remove member, change role (with OWNER rules)
- Non-owner members: Leave team
- Prevent removing last OWNER

## Acceptance Criteria

- [ ] Staff can remove a member from UI
- [ ] Role changes persist and match invite permission rules
- [ ] Athletes can leave without owner intervention


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
