# 340 — Coaching Overview empty state hides pending Start-page requests

**Priority:** Medium
**Type:** UX
**Status:** Fixed
**Area:** `coaching, overview`

## Summary

When a coach has zero athletes, Overview early-returns an empty athletes list and shows only "Connect Your First Athlete". Pending Start-page requests live only on the Athletes page, so coaches with inbound demand see a misleading empty dashboard.

## Evidence

- `server/api/coaching/overview.get.ts` — empty athletes path
- `app/pages/coaching/index.vue` — empty state CTAs
- Pending requests card on `athletes/index.vue` only

## Suggested Fix

Include pending request count/CTA on Overview (or badge on nav Athletes link).

## Acceptance Criteria

- [ ] Coach with pending requests sees them (or a clear CTA) from Overview even with zero athletes


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
