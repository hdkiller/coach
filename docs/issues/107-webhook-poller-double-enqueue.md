# 107 — Webhook Poller Double Enqueue

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, infra`  
**Status:** Open

## Description

cli/worker/start.ts

## Steps to Reproduce

Run multiple webhook workers; same PENDING log enqueued twice.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Atomic claim: update status to QUEUED in same transaction as select.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
