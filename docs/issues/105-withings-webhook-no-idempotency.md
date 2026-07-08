# 105 — Withings Webhook No Idempotency

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, data`  
**Status:** Open

## Description

server/api/integrations/withings/webhook.post.ts

## Steps to Reproduce

Withings retries same notification; multiple parallel full ingests for same user.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Debounce or idempotency key per userid+appli+window.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
