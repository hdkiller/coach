# 333 — Team email-restricted invites never send email

**Priority:** High
**Type:** Gap / UX
**Status:** Fixed
**Area:** `coaching, teams, invites`

## Summary

Direct coach→athlete invites call `sendCoachAthleteInviteEmail`. Team invites (`POST /api/coaching/teams/:id/invites`) create a DB row + code only — no email is sent — while the UI still collects "Restricted to Email", which staff reasonably interpret as invite-by-email.

## Evidence

- `server/api/coaching/athletes/invites.post.ts` — sends email
- `server/api/coaching/teams/[id]/invites.post.ts` — no email
- `app/pages/coaching/teams/[id].vue` — invite modal email field

## Suggested Fix

Send a team invite email (mirror coach-athlete template) **or** relabel the field as "Restrict redemption to this email" and require manual code share.

## Acceptance Criteria

- [ ] Staff are not led to believe an email was sent when it was not
- [ ] If email is supported, failure handling matches athlete-invite behavior


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
