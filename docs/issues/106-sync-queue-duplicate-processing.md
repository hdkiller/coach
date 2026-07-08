# 106 — Sync Queue Duplicate Processing

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, data`  
**Status:** Fixed

> **Fixed (2026-07-08):** `process-sync-queue` atomically claims `PENDING` items with `updateMany` (`PENDING` → `PROCESSING`) before processing.

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

- [x] Bug no longer reproducible via steps above
- [x] Appropriate error handling or auth in place
