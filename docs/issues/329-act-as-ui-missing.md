# 329 — Coaching Act As has no UI entry point

**Priority:** High
**Type:** Gap / UX
**Status:** Fixed
**Area:** `coaching, session`

## Summary

Act As infrastructure exists (store, cookie, `x-act-as-user` interceptor, exit banner, session swap), but no athlete card/profile control calls `startActingAs`. Changelog and older release notes advertise the feature; coach docs admit the control is missing.

## Evidence

- `app/stores/coaching.ts` — `startActingAs` defined
- `app/plugins/coaching-interceptor.ts` — injects header when active
- `app/components/CoachingBanner.vue` — exit UI only
- Grep: no page/component calls `startActingAs`
- `content/documentation/2.coaches/2.acting-as-athlete.md` — documents absence
- `USER_CHANGELOG.md` / `public/content/releases/v0.5.24.md` — still market Act As

## Expected Behavior

Either expose Act As / Stop Acting As on athlete surfaces, or remove/soft-pedal marketing until shipped.

## Suggested Fix

- Add Act As on athlete card/detail (with confirmation).
- Or explicitly deprecate and remove changelog claims; keep interceptor for future use.

## Acceptance Criteria

- [ ] Coaches can enter/exit Act As from UI, **or** product docs/changelog no longer claim it ships
- [ ] Identity-switch side effects (trigger monitor, websocket) remain covered by 027/031 if re-enabled


## Resolution (2026-07-19)

Implemented on branch `cursor/coaching-issues-review-7f31`.
