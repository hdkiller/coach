# 134 — Activities Sync Spinner Stuck

**Type:** Bug  
**Priority:** High  
**Area:** `activities, integrations`  
**Status:** Fixed

## Description

Activities refresh uses syncingData cleared only on dashboard ingest-all completion.

## Steps to Reproduce

Sync from /activities; button stays loading after success.

## Affected Files

- `app/pages/activities.vue`
- `app/stores/integrations.ts`

## Acceptance Criteria

- [x] Issue no longer reproducible
