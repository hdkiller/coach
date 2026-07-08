# 098 — Polar Webhook Missing Userid

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, data`  
**Status:** Open

## Description

server/api/integrations/polar/webhook.post.ts

## Steps to Reproduce

Send Polar webhook; ingest runs with undefined userId tag.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `trigger/ingest-polar.ts`

## Suggested Fix

Resolve userId from Polar payload like other providers.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
