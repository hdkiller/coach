# 308 — Garmin Push Summary Keys Mismatch Health API

**Type:** Bug  
**Priority:** High  
**Area:** `integrations, data`  
**Status:** Fixed

> **Fixed (2026-07-16):** Webhook processing prefers Health API Push list keys (`bodyComps`, `stressDetails`, `allDayRespiration`, `pulseox`) and keeps legacy aliases so existing payloads still match.

## Description

Health API Push notification list keys are documented as `bodyComps`, `stressDetails`, `pulseox`, `allDayRespiration`. `GarminService.processWebhookEvent` looked for `bodyComposition`, `stress`, `pulseOx`, and `respiration`, so body-composition Push never reached `processBodyComp`, and dedicated stress/respiration/pulseOx lists were invisible.

## Steps to Reproduce

1. Receive a Garmin Push payload with only `bodyComps: [...]`.
2. Worker processes webhook.
3. Weight / body-fat never upserted; payload treated as unrecognized or skipped.

## Expected Behavior

Documented Health API keys are recognized. Legacy keys remain accepted for compatibility.

## Affected Files

- `server/utils/services/garminService.ts`
- `tests/unit/server/utils/services/garminService.test.ts`

## Notes

`stressDetails` / `allDayRespiration` / `pulseox` are now detected for routing/`hasSummaryData`, but dedicated persistence for those types is still out of scope (see [309](./309-garmin-health-summary-types-unused.md)). Stress used in recovery today still comes primarily from **dailies** fields.

## Acceptance Criteria

- [x] Prefer documented Push keys
- [x] Keep legacy aliases
- [x] Unit coverage for key preference / fallback
