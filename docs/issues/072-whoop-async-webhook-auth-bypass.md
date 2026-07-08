# 072 — Whoop Async Webhook Auth Bypass

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, backend`  
**Status:** Open

## Description

server/api/integrations/whoop/webhook-async.post.ts

## Steps to Reproduce

POST forged workout.deleted event to async endpoint.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Remove async route or require same signature validation as main webhook.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
