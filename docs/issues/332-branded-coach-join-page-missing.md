# 332 — Branded coach join API exists but `/coach/[slug]/join` page is missing

**Priority:** High
**Type:** Gap
**Status:** Fixed
**Area:** `coaching, public`

## Summary

`GET /api/public/coaches/[slug]/join` and join-experience builders exist (covered by unit tests), but there is no `app/pages/coach/[slug]/join.vue`. Public coach pages are only `index`, `home`, and `start`. Slug-based branded join is unfinished; redemption works only via `/join/{code}`.

## Evidence

- `server/api/public/coaches/[slug]/join.get.ts`
- `app/pages/coach/` — no join page
- `InviteLink` incorrectly routes branded share to Start (328)

## Suggested Fix

Add join page that loads join API and redeems `activeInviteCode`, or remove/deprecate unused public join API.

## Acceptance Criteria

- [ ] Branded join URL either works end-to-end or is removed from product surfaces


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
