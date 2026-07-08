# 162 — Fit Ingest No File Ownership Check

**Type:** Bug  
**Priority:** High  
**Area:** `workouts,backend`  
**Status:** Open

## Description

ingest-fit-file loads FitFile by id without verifying fitFile.userId matches payload.userId.

## Steps to Reproduce

Trigger with wrong userId could ingest another user's file.

## Affected Files

- `trigger/ingest-fit-file.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
