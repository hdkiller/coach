# 099 — Oauth Generic Webhook Ignores Secret

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, backend`  
**Status:** Open

## Description

server/api/webhooks/oauth/[clientId].post.ts

## Steps to Reproduce

POST to webhook URL with wrong secret; still returns success.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `cli/worker/start.ts`

## Suggested Fix

Return 401 on secret mismatch; do not enqueue unverified payloads.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
