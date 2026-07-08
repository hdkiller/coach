# 187 — Profile Tab Unmount Popper Crash

**Type:** Bug  
**Priority:** High  
**Area:** `profile, ui/ux`  
**Status:** Open

## Description

v-if tab panels destroy DOM while USelectMenu poppers open; likely COACH-WATTS-18A root cause.

## Steps to Reproduce

Open select on tab; switch tab; null style error.

## Affected Files

- `app/pages/profile/settings.vue`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
