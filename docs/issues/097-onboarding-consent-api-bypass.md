# 097 — Onboarding Consent Api Bypass

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux, backend`  
**Status:** Open

## Description

server/api/user/consent.post.ts

## Steps to Reproduce

POST /api/user/consent directly without health checkbox; onboarding middleware passes.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `app/pages/onboarding.vue`

## Suggested Fix

Require explicit healthConsentAccepted in request body.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
