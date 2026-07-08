# 127 — Polar Ingest Skips Syncstatus

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, data`  
**Status:** Open

## Description

server/utils/services/polarService.ts

## Steps to Reproduce

Run Polar sync; UI sync status may not reflect in-progress or failed state.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Align with ingest-strava syncStatus lifecycle.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
