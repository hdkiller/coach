# 125 — Oauth Dangerous Email Account Linking

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, backend`  
**Status:** Open

## Description

server/api/auth/[...].ts

## Steps to Reproduce

OAuth identity with victim email links into existing account without verification.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Disable dangerous linking or require verified email match + confirmation.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
