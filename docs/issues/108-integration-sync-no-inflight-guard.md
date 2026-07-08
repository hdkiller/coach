# 108 — Integration Sync No Inflight Guard

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, ui/ux`  
**Status:** Open

## Description

server/api/integrations/sync.post.ts

## Steps to Reproduce

Rapidly click Sync or overlap webhook+manual sync; stacked ingest jobs.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Check running ingest tasks; return 409 if sync in progress.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
