# 111 — Oauth Consent Csrf

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, ui/ux`  
**Status:** Open

## Description

app/pages/oauth/authorize.vue

## Steps to Reproduce

Craft page that auto-POSTs approve to authorize endpoint while user logged in.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `server/api/oauth/authorize.post.ts`

## Suggested Fix

Add CSRF token or SameSite cookie + state validation.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
