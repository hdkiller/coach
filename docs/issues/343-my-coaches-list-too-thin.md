# 343 — My Coaches list is too thin for athlete management

**Priority:** Medium
**Type:** UX
**Status:** Fixed
**Area:** `coaching, athletes`

## Summary

Athletes only see coach name, email, and Remove. Missing: connected-since, link to public coach profile/start page, explanation of what the coach can access, and pending outbound invite status beyond the code card.

## Evidence

- `app/pages/coaching/team/index.vue` — My Coaches cards
- Docs describe richer mental model than UI shows

## Suggested Fix

Enrich coach cards; link to public presence when slug exists; short "What they can see" disclosure near Remove.

## Acceptance Criteria

- [ ] Athlete can understand who coaches them and revoke with informed consent


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
