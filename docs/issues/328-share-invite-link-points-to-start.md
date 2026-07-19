# 328 — Public share InviteLink copies Start page URL instead of join URL

**Priority:** Critical
**Type:** Bug
**Status:** Fixed
**Area:** `coaching, invites, public`

## Summary

When a coach creates a **public share link** invite, `CoachingInviteLink` is passed `coach-slug` and builds the copyable/QR URL via `buildPublicCoachStartPath` → `/coach/{slug}/start`. The Start page is **request-only** onboarding; it does **not** redeem the invite code. Athletes scanning/copying the "Join URL" enter a pending-request flow instead of connecting via the invite.

## Steps to Reproduce

1. Coach: Athletes → Create Share Link.
2. Copy Join URL (or scan QR) from the pending invite row.
3. Observe URL is `/coach/{slug}/start`, not `/join/{code}`.
4. Athlete opens URL and submits Start form → pending request, not immediate relationship.

## Expected Behavior

Share-link invite copy/QR points at a redemption URL (`/join/{code}` or branded join that redeems `activeInviteCode`).

## Actual Behavior

Copy/QR points at Start page; invite code is unused by that URL.

## Affected Files

- `app/components/coaching/InviteLink.vue` — `joinUrl` prefers start path when `coachSlug` set
- `app/pages/coaching/athletes/index.vue` — passes `:coach-slug` for public invites
- `app/components/public/CoachStartPage.vue` / `server/api/public/coaches/[slug]/start/request.post.ts` — request flow only
- Related gap: branded join API without page — [332](./332-branded-coach-join-page-missing.md)

## Suggested Fix

- For invite redemption, always use `/join/{code}` (or `/coach/{slug}/join` once 332 lands).
- Do not pass `coachSlug` into InviteLink for share invites unless the join page redeems the code.
- Keep Start page only for intake requests.

## Acceptance Criteria

- [ ] Copy Join URL / QR for a public share invite redeem the invite without Start-page approval
- [ ] Start page remains available as a separate intake path


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
