# 128 — Trigger Is Task Running Fails Open

**Type:** Bug  
**Priority:** Medium  
**Area:** `infra, data`  
**Status:** Open

## Description

trigger/ingest-all.ts

## Steps to Reproduce

Trigger API blip during ingest-all; duplicate deduplicate-workouts jobs enqueued.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Fail closed or retry check before allowing duplicate trigger.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
