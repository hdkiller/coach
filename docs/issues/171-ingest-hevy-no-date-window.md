# 171 — Ingest Hevy No Date Window

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, data`  
**Status:** Fixed

> **Fixed (2026-07-08):** `ingest-hevy` accepts `startDate`/`endDate` from ingest-all and stops pagination once workouts fall outside the requested window.

## Description

Hevy ingest paginates entire history with no startDate/endDate filter when called from ingest-all.

## Steps to Reproduce

Run ingest-all with Hevy connected; entire history pulled not 7-day window.

## Affected Files

- `trigger/ingest-hevy.ts`
- `trigger/ingest-all.ts`

## Acceptance Criteria

- [x] Issue no longer reproducible
- [x] Appropriate fix verified
