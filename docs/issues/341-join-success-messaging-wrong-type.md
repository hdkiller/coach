# 341 — Join success toast/redirect ignores invite type

**Priority:** Medium
**Type:** UX / Onboarding
**Status:** Fixed
**Area:** `coaching, join`

## Summary

`/join/[code]` treats every non-TEAM accept as "Successfully connected with coach!" and redirects to `/coaching/team`. That is wrong when type is `COACHING` (coach redeeming an athlete code — should go to Athletes) and weak for `ATHLETE_INVITE` (athlete just connected — needs next-step guidance, not pro-team UI).

## Evidence

- `app/pages/join/[code].vue` (~49–60)
- `server/api/join/[code].post.ts` — TEAM / COACHING / ATHLETE_INVITE types

## Suggested Fix

Branch toast + redirect by type: coach→`/coaching/athletes`, athlete→dashboard or My Coaches with checklist, team→team page (already).

## Acceptance Criteria

- [ ] Coach redeeming athlete code lands on Athletes with correct toast
- [ ] Athlete accepting coach invite lands on a sensible next step


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
