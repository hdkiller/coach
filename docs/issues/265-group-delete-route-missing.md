# 265 — Delete Group button calls missing API route

**Priority:** High  
**Type:** Bug  
**Status:** Fixed  
**Area:** `coaching, groups, backend`

## Summary

`GroupManager.vue` calls `DELETE /api/coaching/groups/{id}`, but no `[id].delete.ts` exists under `server/api/coaching/groups/`. `teamRepository.deleteGroup` and `updateGroup` are implemented but unreachable. Deleting a group always fails with a toast.

Rename/edit group from UI is also impossible — no `PATCH` route.

## Steps to Reproduce

1. Open coaching athletes page → Manage Groups.
2. Click trash icon on any group → confirm delete.
3. Toast: "Failed to delete group" (404).

## Expected Behavior

- DELETE removes group and member rows (with auth checks).
- Optional: PATCH for rename/description.

## Actual Behavior

- Client: `GroupManager.vue` ~L361–369 → `DELETE /api/coaching/groups/${group.id}`
- Server: routes are `index.get/post`, `[id].get`, `[id]/members/*` only.

## Affected Files

- `app/components/coaching/GroupManager.vue` — `confirmDeleteGroup`
- `server/utils/repositories/teamRepository.ts` — `deleteGroup`, `updateGroup` (dead)
- Missing: `server/api/coaching/groups/[id].delete.ts`
- Missing (optional): `server/api/coaching/groups/[id].patch.ts`

## Suggested Fix

- Add `[id].delete.ts`: `requireAuth(['coaching:write'])`, load group, verify owner or team staff (`checkTeamAccess`), call `teamRepository.deleteGroup`.
- Add `[id].patch.ts` if rename is desired in the same pass.
- Mirror auth patterns from `[id]/members.post.ts` and `[id].get.ts`.

## Acceptance Criteria

- [ ] DELETE group succeeds for group owner and authorized team staff
- [ ] DELETE returns 403 for unauthorized users, 404 for missing group
- [ ] Group list refreshes after delete
- [ ] (Optional) PATCH rename works from Manage Groups UI
