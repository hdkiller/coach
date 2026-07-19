# 346 — `SUSPENDED` coaching relationship status is unused

**Priority:** Medium
**Type:** Gap
**Status:** Open
**Area:** `coaching, relationships`

## Summary

Plans/docs mention ACTIVE/SUSPENDED. Schema stores free-form status defaulting to ACTIVE. All checks filter `ACTIVE` only; no suspend/reactivate API or UI. Soft-pause of access is impossible (related to hard remove gap — 330).

## Evidence

- `prisma/schema.prisma` — `CoachingRelationship.status`
- `docs/06-plans/coaching-feature.md`
- Repository `checkRelationship` / queries use `'ACTIVE'` only

## Suggested Fix

Implement suspend/reactivate end-to-end, or remove SUSPENDED from docs/schema narrative.

## Acceptance Criteria

- [ ] Suspended relationships cannot access private coach APIs, **or** docs no longer claim the status
