# 342 — Team roster empty-state CTAs ignore member role

**Priority:** Medium
**Type:** UX
**Status:** Fixed
**Area:** `coaching, teams`

## Summary

Empty team roster shows "Invite with Code" / "Add Coached Athlete" without staff `v-if`. The header Add Athlete button and share card are staff-gated; athlete members can open empty-state modals that 403.

## Evidence

- `app/pages/coaching/teams/[id].vue` empty roster (~78–105) vs staff-gated buttons (~62–75)

## Suggested Fix

Gate empty-state CTAs with the same staff checks; show athlete-appropriate empty copy.

## Acceptance Criteria

- [ ] Athlete members do not see staff invite CTAs that fail with 403


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
