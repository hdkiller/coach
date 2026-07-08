# 060 — Integration `syncStatus` can remain stuck on `SYNCING`

**Type:** Bug  
**Priority:** Medium  
**Area:** `integrations`, `backend`, `data`  
**Status:** Fixed

> **Fixed (2026-07-08):** `ingest-strava` and `ingest-intervals` use `finally` blocks to always clear `SYNCING` to a terminal `SUCCESS` or `FAILED` status.

## Description

Ingest tasks (Strava, Intervals, etc.) set `integration.syncStatus = 'SYNCING'` at start and reset it in `catch`, but not in `finally`. On Trigger timeout, OOM, or process kill, status stays `SYNCING` with no recovery path. UI may show perpetual “syncing” state.

## Root Cause

Pattern in ingest tasks:

```71:74:trigger/ingest-strava.ts
    await prisma.integration.update({
      where: { id: integration.id },
      data: { syncStatus: 'SYNCING' }
    })
```

Status reset only in error handler, not `finally`.

## Steps to Reproduce

1. Start integration sync.
2. Kill task mid-run (timeout/OOM).
3. Integration status remains `SYNCING` in DB and UI.

## Expected Behavior

- Status always transitions to `IDLE` or `ERROR` when task ends.

## Actual Behavior

- Abnormal termination leaves `SYNCING` indefinitely.

## Affected Files

- `trigger/ingest-strava.ts`
- `trigger/ingest-intervals.ts`
- Similar ingest tasks

## Suggested Fix

Use `finally` block to set terminal status; add stale-SYNCING recovery job or timeout sweep.

## Acceptance Criteria

- [x] Normal and abnormal task exit clears SYNCING state
- [x] UI reflects accurate sync status after task ends
