# 171 — Ingest Hevy No Date Window

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, data`  
**Status:** Open

## Description

Hevy ingest paginates entire history with no startDate/endDate filter when called from ingest-all.

## Steps to Reproduce

Run ingest-all with Hevy connected; entire history pulled not 7-day window.

## Affected Files

- `trigger/ingest-hevy.ts`
- `trigger/ingest-all.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
