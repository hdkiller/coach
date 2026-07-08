# 155 — Workout Share Leaks Zone Profiles

**Type:** Bug  
**Priority:** High  
**Area:** `workouts, integrations`  
**Status:** Fixed

> **Fixed (2026-07-08):** Excluded `hrZones` and `powerZones` from user select in workout share response.

## Description

Share API returns hrZones and powerZones.

## Steps to Reproduce

Zone data in public response.

## Affected Files

- `server/api/share/workouts/[token].get.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
