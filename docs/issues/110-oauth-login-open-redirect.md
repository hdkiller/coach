# 110 — Oauth Login Open Redirect

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, ui/ux`  
**Status:** Open

## Description

app/pages/oauth/login.vue

## Steps to Reproduce

Visit /oauth/login?callbackUrl=https://evil.example; Continue sends user off-site.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `app/pages/oauth/authorize.vue`

## Suggested Fix

Validate callbackUrl is same-origin or allowlisted.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
