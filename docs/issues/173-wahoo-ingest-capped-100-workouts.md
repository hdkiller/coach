# 173 — Wahoo Ingest Capped 100 Workouts

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, data`  
**Status:** Open

## Description

Wahoo ingest fetches only page 1 limit 100 with no pagination.

## Steps to Reproduce

User with >100 Wahoo workouts in window gets truncated data.

## Affected Files

- `trigger/ingest-wahoo.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
