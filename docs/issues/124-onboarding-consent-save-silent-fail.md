# 124 — Onboarding Consent Save Silent Fail

**Type:** UI  
**Priority:** Medium  
**Area:** `ui/ux, backend`  
**Status:** Open

## Description

app/pages/onboarding.vue

## Steps to Reproduce

Fail /api/user/consent during onboarding; button stops loading with no feedback.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Show error toast; keep user on consent step.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
