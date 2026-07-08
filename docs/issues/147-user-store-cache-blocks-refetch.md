# 147 — User Store Cache Blocks Refetch

**Type:** Bug  
**Priority:** High  
**Area:** `ui/ux, backend`  
**Status:** Fixed

## Description

User store cache prevents refetch after login switch.

## Steps to Reproduce

Wrong user shown without force refetch.

## Affected Files

- `app/stores/user.ts`

## Acceptance Criteria

- [x] Issue no longer reproducible
