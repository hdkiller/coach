# 178 — Ingest All Auto Readiness No Idempotency

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, planning`  
**Status:** Open

## Description

ingest-all triggers recommend-today-activity without idempotency or isTaskRunning guard.

## Steps to Reproduce

Overlapping syncs enqueue duplicate recommendation jobs.

## Affected Files

- `trigger/ingest-all.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
