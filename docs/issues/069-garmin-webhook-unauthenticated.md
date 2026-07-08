# 069 — Garmin Webhook Unauthenticated

**Type:** Bug  
**Priority:** Critical  
**Area:** `integrations, backend`  
**Status:** Open

## Description

server/api/webhooks/garmin.post.ts

## Steps to Reproduce

POST fake Garmin payload with known externalUserId to webhook endpoint.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `server/utils/services/garminService.ts`

## Suggested Fix

Implement Garmin signature verification; reject unverified payloads.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
