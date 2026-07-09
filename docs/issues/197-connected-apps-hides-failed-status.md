# 197 — Connected Apps Hides Failed Status

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, ui/ux`  
**Status:** Fixed

## Description

whoopConnected/withingsConnected only check provider exists not syncStatus FAILED.

## Steps to Reproduce

Revoked token shows connected with Sync Now; COACH-WATTS-6Z/YD.

## Affected Files

- `app/pages/settings/apps.vue`

## Acceptance Criteria

- [x] Issue no longer reproducible
- [x] Appropriate fix verified
