# 174 — Garmin Ingest Silent Noop Missing Integration

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, data`  
**Status:** Fixed

> **Fixed (2026-07-16):** `ingest-garmin` throws when the Garmin integration is missing, matching Strava/Whoop/Oura and other ingest tasks. `ingest-all` already isolates per-provider failures in try/catch.

## Description

Garmin ingest returns without throw when integration missing; callers treat as success.

## Steps to Reproduce

Trigger without Garmin integration; task completes successfully with no output.

## Affected Files

- `trigger/ingest-garmin.ts`

## Acceptance Criteria

- [x] Issue no longer reproducible
- [x] Appropriate fix verified
