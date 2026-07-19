# 275 — Coaching pages low-priority polish

**Priority:** Low  
**Type:** Maintenance / Polish  
**Status:** Open  
**Area:** `coaching`

## Summary

Miscellaneous low-severity items from the 2026-07-14 coaching pages review. Fix opportunistically or when touching nearby code.

## Items

### 275a — `approveCoachingRequest` double-click

`approveCoachingRequest` reads pending status outside transaction; double-click can process twice (harmless upsert, but request row updates twice). Move status check inside transaction or use conditional update `where: { status: 'PENDING' }`.

**Files:** `server/utils/repositories/coachingRepository.ts`

### 275b — Calendar drag `JSON.parse` without try/catch

`CoachCalendarPanel.vue` ~L209: malformed drag payload throws unhandled error.

**Fix:** wrap in try/catch, ignore invalid drops.

**Files:** `app/components/coaching/CoachCalendarPanel.vue`

### 275c — Team delete fetches before ownership check

`teams/[id].delete.ts` loads full team details before verifying caller is OWNER — existence leak (404 vs 403 ordering). Check access first or return generic 404 for non-owners.

**Files:** `server/api/coaching/teams/[id].delete.ts`

### 275d — Dead code

- `copyInvite()` in `app/pages/coaching/team/index.vue` ~L516 — unused
- Empty `athleteInTeam` block in `groups/[id]/members.post.ts` ~L65-68 — incomplete logic
- `updateTeam` in repository — no PATCH route; team rename not possible from UI

### 275e — Message athlete no context (see 116)

`useCoachingMessageAthlete` only pre-fills generic prompt; no `athleteId` context. Tracked separately as [116](./116-coaching-message-athlete-no-context.md) — fix together if desired.

## Acceptance Criteria

- [ ] Each sub-item addressed or explicitly deferred with comment
- [ ] No new regressions in coaching flows


## Re-verify notes (2026-07-19)

- **275b:** Calendar drag `JSON.parse` appears try/caught in current `CoachCalendarPanel.vue` — confirm before closing.
- **275e / 116:** Still open (Message Athlete context).
- Other 275a/c/d items still need verification.
