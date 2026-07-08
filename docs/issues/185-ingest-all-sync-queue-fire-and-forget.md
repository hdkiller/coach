# 185 — Ingest All Sync Queue Fire And Forget

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations, data`  
**Status:** Open

## Description

ingest-all triggers process-sync-queue without waiting before provider pulls.

## Steps to Reproduce

Race between push and pull during batch sync.

## Affected Files

- `trigger/ingest-all.ts`
- `trigger/process-sync-queue.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
