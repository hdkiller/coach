# 273 — Team invite email restriction is case-sensitive

**Priority:** Medium  
**Type:** Bug  
**Status:** Fixed  
**Area:** `coaching, teams`

## Summary

Team invite email is lowercased at creation (`data.email?.toLowerCase()`), but `acceptInvite` compares against the user's stored email **without** lowercasing. A user registered as `John@X.com` cannot accept an invite restricted to `john@x.com`.

The coaching-invite path (`acceptAthleteInviteForCoach`) lowercases correctly.

## Steps to Reproduce

1. Staff creates team invite for `john@example.com`.
2. User with account email `John@Example.com` tries to accept.
3. Error: "This invite is restricted to another email address."

## Affected Files

- `server/utils/repositories/teamRepository.ts` — `acceptInvite` ~L315-319

## Suggested Fix

```ts
const userEmail = (await prisma.user.findUnique(...))?.email?.toLowerCase()
if (invite.email && invite.email !== userEmail) { ... }
```

## Acceptance Criteria

- [ ] Case-insensitive email match on team invite accept
- [ ] Coaching invite behavior unchanged
- [ ] Unit test: mixed-case user email accepts lowercased invite
