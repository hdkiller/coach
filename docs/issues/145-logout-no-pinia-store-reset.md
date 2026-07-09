# 145 — Logout No Pinia Store Reset

**Type:** Bug  
**Priority:** High  
**Area:** `ui/ux, backend`  
**Status:** Fixed

## Description

Logout does not reset Pinia stores.

## Steps to Reproduce

Stale data after account switch.

## Affected Files

- `app/composables/useAppLogout.ts`

## Acceptance Criteria

- [x] Issue no longer reproducible
