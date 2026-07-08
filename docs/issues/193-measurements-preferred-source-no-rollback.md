# 193 — Measurements Preferred Source No Rollback

**Type:** Bug  
**Priority:** Medium  
**Area:** `profile, ui/ux`  
**Status:** Open

## Description

updateDashboardSettings optimistic merge without rollback on PATCH failure.

## Steps to Reproduce

Change preferred source; save fails; UI shows wrong source.

## Affected Files

- `app/stores/user.ts`
- `app/components/profile/MeasurementsSettings.vue`

## Acceptance Criteria

- [ ] Issue no longer reproducible
- [ ] Appropriate fix verified
