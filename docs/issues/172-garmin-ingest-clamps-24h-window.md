# 172 — Garmin Ingest Clamps 24h Window

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, data`  
**Status:** Open

## Description

ingest-all passes multi-day window but ingest-garmin clamps to last 24 hours of range.

## Steps to Reproduce

Sync all with Garmin; only last day ingested despite 7-day batch window.

## Affected Files

- `trigger/ingest-garmin.ts`
- `trigger/ingest-all.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
