# 191 — Profile Autodetect No Rollback

**Type:** Bug  
**Priority:** Medium  
**Area:** `profile, ui/ux`  
**Status:** Open

## Description

handleAutodetect applies local state before PATCH; failure only toasts without rollback.

## Steps to Reproduce

Autodetect PATCH fails; local profile corrupted until refresh.

## Affected Files

- `app/pages/profile/settings.vue`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
