# 170 — Deduplicate Auto Analyzes All Recent

**Type:** Bug  
**Priority:** Medium  
**Area:** `workouts,ai`  
**Status:** Open

## Description

deduplicate-workouts with aiAutoAnalyze enqueues analysis for all unanalyzed last-30-day workouts not just merged.

## Steps to Reproduce

Unexpected analysis burst after dedup run.

## Affected Files

- `trigger/deduplicate-workouts.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
