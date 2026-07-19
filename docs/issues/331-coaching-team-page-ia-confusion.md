# 331 — Coaching "Team" page mixes My Coaches, invite-a-coach, and professional teams

**Priority:** High
**Type:** UX / IA
**Status:** Fixed
**Area:** `coaching, navigation`

## Summary

`/coaching/team` is titled "My Team" and combines three distinct jobs: (1) athlete personal Invite a Coach code, (2) Professional Teams create/join, (3) My Coaches list. Sidebar/nav label is simply "Team", so athletes hunting for coaches and coaches managing orgs share one confusing surface.

## Evidence

- `app/pages/coaching/team/index.vue` — all three sections on one page
- `app/components/coaching/CoachingNavbarLinks.vue` / `app/layouts/default.vue` — nav item "Team" → `/coaching/team`

## Suggested Fix

- Split routes: e.g. `/coaching/coaches` (athlete) vs `/coaching/teams` (org list), or clear page sections + nav labels ("My Coaches" / "Organizations").
- Point athletes' primary path at My Coaches; keep pro teams secondary.

## Acceptance Criteria

- [ ] Athlete can find "My Coaches" without opening professional-team empty states first
- [ ] Coach creating an org is not mixed with athlete invite-code CTA language


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
