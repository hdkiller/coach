# 101 — Wahoo Webhook Auth Optional

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, backend`  
**Status:** Open

## Description

server/api/integrations/wahoo/webhook.post.ts

## Steps to Reproduce

Unset WAHOO_WEBHOOK_KEY; POST forged workout_summary for known user id.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- `server/utils/services/wahooService.ts`

## Suggested Fix

Reject webhooks when key unset in production.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
