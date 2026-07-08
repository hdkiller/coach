# 100 — Strava Webhook Post Unauthenticated

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, backend`  
**Status:** Open

## Description

server/api/integrations/strava/webhook.ts

## Steps to Reproduce

POST forged Strava event with known owner_id; ingest/delete triggered.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Document risk; implement Strava verification if available or rate-limit by owner_id.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
