# 071 — Oauth Auth Code Ignores Redirect Uri

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, backend`  
**Status:** Open

## Description

server/api/oauth/token.post.ts

## Steps to Reproduce

Intercept auth code; exchange with different redirect_uri than approved.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `server/utils/repositories/oauthRepository.ts`

## Suggested Fix

Compare redirect_uri on token exchange per RFC 6749 §4.1.3.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
