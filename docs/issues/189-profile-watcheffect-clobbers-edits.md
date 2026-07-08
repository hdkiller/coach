# 189 — Profile Watcheffect Clobbers Edits

**Type:** Bug  
**Priority:** Medium  
**Area:** `profile, ui/ux`  
**Status:** Open

## Description

watchEffect re-merges server profile on refresh overwriting in-progress edits on other tabs.

## Steps to Reproduce

Edit basic tab; save nutrition; basic edits lost.

## Affected Files

- `app/pages/profile/settings.vue`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
