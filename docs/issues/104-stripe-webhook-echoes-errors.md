# 104 — Stripe Webhook Echoes Errors

**Type:** Bug  
**Priority:** Medium  
**Area:** `billing, backend`  
**Status:** Open

## Description

server/api/stripe/webhook.post.ts

## Steps to Reproduce

Send invalid Stripe signature; response includes err.message detail.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Return generic 400; log specifics server-side.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
