# 263 — Public coach/team share invites are single-use

**Priority:** Critical  
**Type:** Bug  
**Status:** Fixed  
**Area:** `coaching, backend, teams`

## Summary

Coach and team share links are advertised in the UI as **reusable community links** ("Anyone with an account can join under you from this link"), but the accept handlers mark the invite `ACCEPTED` on first redemption even when `email` is null (public). The second athlete gets "Invalid or expired invite code."

After the first accept, the branded coach join page degrades: `GET /api/public/coaches/[slug]/join` returns `fallbackToGenericJoin: true` because `getActivePublicAthleteInviteForCoach` only returns `PENDING` invites.

## Steps to Reproduce

1. Coach creates a **public share link** (no email) from `/coaching/athletes` → Invite tab → Share.
2. Athlete A accepts via `/join/{code}` or branded join page.
3. Athlete B tries the same link → error: invalid/expired invite.
4. Coach's public join page (`/coaches/{slug}/join`) no longer shows the active invite until they manually regenerate.

Same flow for team share invites on `/coaching/teams/[id]`.

## Expected Behavior

- Public (`email IS NULL`) invites remain `PENDING` until expiry or explicit revocation.
- Each accept records usage (e.g. `acceptedBy` on relationship, optional `acceptCount`, or separate redemption log) without invalidating the code.
- Branded join page stays active for the invite's lifetime.

## Actual Behavior

- `acceptAthleteInviteForCoach` unconditionally sets `CoachAthleteInvite.status = 'ACCEPTED'` after first use.
- `teamRepository.acceptInvite` unconditionally sets `TeamInvite.status = 'ACCEPTED'` after first use.

## Affected Files

- `server/utils/repositories/coachingRepository.ts` — `acceptAthleteInviteForCoach`, `createAthleteInviteForCoach`
- `server/utils/repositories/teamRepository.ts` — `acceptInvite`, `createTeamInvite`
- `server/api/public/coaches/[slug]/join.get.ts` — `fallbackToGenericJoin` when no pending public invite
- `app/pages/coaching/athletes/index.vue` — multi-use copy at ~L461
- `app/pages/coaching/teams/[id].vue` — multi-use copy at ~L138

## Suggested Fix

- For public invites: on accept, upsert relationship/membership but **leave invite `PENDING`** (or introduce `MULTI_USE` status).
- Email-restricted invites can remain single-use (`ACCEPTED` after first match).
- Optionally track `lastAcceptedAt` / `acceptCount` for observability.
- Add unit tests: two different users accept same public coach invite and same public team invite.

## Acceptance Criteria

- [ ] Two athletes can join from the same public coach share link before expiry
- [ ] Two athletes can join from the same public team share link before expiry
- [ ] Email-restricted invites still reject wrong email and become unusable after successful accept
- [ ] Branded coach join page remains active until invite expires or coach revokes/regenerates
- [ ] UI copy matches behavior (multi-use vs single-use)
