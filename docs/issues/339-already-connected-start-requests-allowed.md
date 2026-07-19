# 339 — Already-connected athletes can still submit Start-page coaching requests

**Priority:** Medium
**Type:** UX / Edge case
**Status:** Fixed
**Area:** `coaching, public, requests`

## Summary

`createCoachingRequestForAthlete` blocks duplicate PENDING requests but not an existing ACTIVE relationship with the same coach. Start page viewer does not expose "already connected to this coach". Athletes can create noise requests that approve into a no-op upsert.

## Evidence

- `server/utils/repositories/coachingRepository.ts` — request creation checks
- `server/api/public/coaches/[slug]/start.get.ts` / Start UI submit path

## Suggested Fix

Short-circuit when ACTIVE with this coach; show Connected / Pending states on Start page.

## Acceptance Criteria

- [ ] Connected athletes cannot create a new PENDING request for the same coach
- [ ] UI explains current connection/pending state


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
