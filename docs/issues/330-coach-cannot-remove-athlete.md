# 330 — Coach cannot remove / end relationship with an athlete

**Priority:** High
**Type:** Gap / UX
**Status:** Fixed
**Area:** `coaching, relationships`

## Summary

Only athletes can end a direct coaching relationship (`DELETE /api/coaching/coaches/:id`). There is no coach-facing API or UI to remove an athlete from their roster. `removeRelationship` exists in the repository but is only wired for the athlete→coach direction.

## Evidence

- `server/api/coaching/coaches/[id].delete.ts` — athlete removes coach
- No `DELETE /api/coaching/athletes/:id`
- Athlete detail / AthleteCard have Message/View but no Remove
- Docs: athletes revoke via My Coaches; coaches have no equivalent

## Expected Behavior

Coach can end or suspend coaching access for an athlete (with confirmation), removing private-data access.

## Suggested Fix

- Add coach-authenticated DELETE (or status→SUSPENDED — see 346) for relationships they own.
- Wire UI on athlete card/detail + confirmation modal.

## Acceptance Criteria

- [ ] Coach can remove an athlete and loses access to private coach APIs for that athlete
- [ ] Athlete is notified or sees coach disappear from My Coaches


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
