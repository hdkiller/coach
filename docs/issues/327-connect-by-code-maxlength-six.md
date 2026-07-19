# 327 — Connect-by-code input truncates to 6 characters (codes are 10)

**Priority:** Critical
**Type:** Bug
**Status:** Fixed
**Area:** `coaching, invites`

## Summary

Coach "Connect by Code" modal uses `maxlength="6"` and help text saying codes are 6 characters, but invite codes are generated as **10** characters (`INVITE_CODE_LENGTH = 10`). Coaches cannot enter a full athlete personal invite code.

## Steps to Reproduce

1. As athlete, open Coaching → Team → Generate Invite Code (10-char code shown).
2. As coach, open Coaching → Athletes → Invite Athlete → Connect by Code.
3. Attempt to paste the 10-character code.

## Expected Behavior

Input accepts the full generated code length (10) and connects successfully.

## Actual Behavior

Input truncates at 6 characters; Connect stays disabled or submits an incomplete code.

## Affected Files

- `app/pages/coaching/athletes/index.vue` (~502–556) — `maxlength="6"`, help text, disabled when `length < 6`
- `server/utils/invite-code.ts` — `INVITE_CODE_LENGTH = 10`
- `server/utils/repositories/coachingRepository.ts` — `createInvite` uses `generateInviteCode()`

## Suggested Fix

- Set `maxlength` / validation / help copy to 10 (or shared constant).
- Optionally accept pasted `/join/CODE` URLs and extract the code.

## Acceptance Criteria

- [ ] Coach can paste a full athlete invite code and connect
- [ ] Help text matches actual code length
- [ ] Team join modal (also maxlength 10) stays consistent


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
