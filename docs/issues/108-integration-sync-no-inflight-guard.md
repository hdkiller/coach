# 108 — Integration Sync No Inflight Guard

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, ui/ux`  
**Status:** Fixed

> **Fixed (2026-07-08):** `POST /api/integrations/sync` returns 409 when the target integration (or any integration for `all`) has `syncStatus === 'SYNCING'`.

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

- [x] Bug no longer reproducible via steps above
- [x] Appropriate error handling or auth in place
