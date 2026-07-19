# 269 — Older coaching endpoints skip `requireAuth` guards

**Priority:** Medium  
**Type:** Security / Consistency  
**Status:** Fixed  
**Area:** `coaching, auth, backend`

## Summary

Several legacy coaching routes use `getServerSession` directly instead of `requireAuth`, skipping deactivated-account checks and behaving differently for API-key/OAuth callers than the rest of `/api/coaching`.

`coaches/[id].delete` also returns success (`deleteMany` count 0) when no relationship exists.

## Affected Endpoints

- `server/api/coaching/invite.get.ts`
- `server/api/coaching/invite.post.ts`
- `server/api/coaching/athletes/connect.post.ts`
- `server/api/coaching/coaches/[id].delete.ts`

## Expected Behavior

- All coaching mutations use `requireAuth` with appropriate scopes (`coaching:read` / `coaching:write`).
- Deactivated users rejected consistently.
- Delete returns 404 when relationship not found.

## Suggested Fix

- Replace `getServerSession` + manual checks with `requireAuth`.
- `coaches/[id].delete`: verify `deleteMany.count > 0` or use `delete` with not-found handling.

## Acceptance Criteria

- [ ] All four endpoints use `requireAuth`
- [ ] Deactivated account cannot call these endpoints
- [ ] Disconnect coach returns 404 when relationship missing
- [ ] OAuth/API-key callers get same auth behavior as session users
