# 106 — Sync Queue Duplicate Processing

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, data`  
**Status:** Open

## Description

trigger/process-sync-queue.ts

## Steps to Reproduce

Trigger two process-sync-queue runs concurrently; duplicate Intervals API calls for same entity.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Add claim step or SELECT FOR UPDATE.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
