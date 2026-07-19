# 347 — Multi-coach team staff still cannot share athlete data (Option B friction)

**Priority:** Medium
**Type:** Product / UX
**Status:** Fixed
**Area:** `coaching, teams, authz`
**Related:** [266](./266-team-staff-cannot-access-roster-athletes.md) (Fixed via Option B)

## Summary

266 was resolved by hiding View when `canViewDetails` is false (direct relationship required). Multi-coach organizations still cannot share athlete private data: a team COACH who did not personally connect an athlete sees masked "Not Your Athlete" cards. Accepting a team COACH invite does not create `CoachingRelationship` rows. In-product copy does not explain this.

## Evidence

- `server/utils/coaching-auth.ts` — direct relationship only
- Team invite role COACH → `TeamMember` only
- Roster `canViewDetails` / AthleteCard masking

## Suggested Fix

Choose and ship one model:
- **A)** Team staff read (or read/write) access for same-team athletes
- **B keep)** Require per-coach connect, but add clear UI copy + CTA "Connect to coach this athlete" when inviting staff

## Acceptance Criteria

- [ ] Staff invite / roster UI states whether team role grants athlete-data access
- [ ] If Option A chosen, APIs and UI aligned with tests


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
