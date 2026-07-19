# 267 — Weak invite codes with no redemption rate limiting

**Priority:** High  
**Type:** Security  
**Status:** Fixed  
**Area:** `coaching, auth, backend`

## Summary

Invite codes use `Math.random().toString(36)` (not CSPRNG): 6 chars for athlete personal codes, 8 for coach/team invites. `/api/join/[code].post` and `/api/coaching/athletes/connect` have no rate limiting. A guessed athlete code grants **full coach access** to that user's training, wellness, and profile.

`substring(2, 8)` can emit codes shorter than 6 chars. No collision retry on `@unique` code column (rare P2002 → 500).

## Steps to Reproduce

1. Rapid-fire POST `/api/join/{code}` with random codes — no throttle.
2. Observe code generation in `createInvite` / `createAthleteInviteForCoach` / `createTeamInvite` uses `Math.random()`.

## Expected Behavior

- Codes from `crypto.randomBytes` (or equivalent CSPRNG), minimum length ≥ 10.
- Retry on unique constraint collision.
- Rate limit redemption by IP + account (e.g. 10 attempts/minute).
- Lockout or exponential backoff after repeated failures.

## Actual Behavior

- `coachingRepository.ts` ~L846, ~L770 — `Math.random().toString(36).substring(...)`
- `teamRepository.ts` ~L268 — same pattern
- No middleware rate limiting on join/connect endpoints.

## Affected Files

- `server/utils/repositories/coachingRepository.ts` — `createInvite`, `createAthleteInviteForCoach`
- `server/utils/repositories/teamRepository.ts` — `createTeamInvite`
- `server/api/join/[code].post.ts`
- `server/api/coaching/athletes/connect.post.ts`

## Suggested Fix

- Shared `generateInviteCode(length)` using `crypto.randomBytes`, uppercase alphanumeric.
- `createWithUniqueCode` helper with retry loop on P2002.
- Add rate limiter (reuse pattern from `public/contact.post.ts` or h3 shield) on code redemption routes.
- Do **not** weaken existing auth on successful redeem.

## Acceptance Criteria

- [ ] New invites use CSPRNG codes of sufficient length
- [ ] Code collision handled without 500
- [ ] Redemption endpoints throttle brute force
- [ ] Existing valid codes continue to work until expiry
- [ ] Unit test for collision retry and rate limit behavior
