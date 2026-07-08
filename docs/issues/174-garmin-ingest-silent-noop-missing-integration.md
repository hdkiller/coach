# 174 — Garmin Ingest Silent Noop Missing Integration

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, data`  
**Status:** Open

## Description

Garmin ingest returns without throw when integration missing; callers treat as success.

## Steps to Reproduce

Trigger without Garmin integration; task completes successfully with no output.

## Affected Files

- `trigger/ingest-garmin.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
