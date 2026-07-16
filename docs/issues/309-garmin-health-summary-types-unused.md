# 309 — Garmin Health Summary Types Unused

**Type:** Enhancement  
**Priority:** Medium  
**Area:** `integrations, data`  
**Status:** Fixed (thin slice)

> **Fixed (2026-07-16):** Documented intentional core subset. Added pull + connect backfill for **bodyComps** and **userMetrics** only (processors already existed). Remaining types stay deferred.

## Description

Wellness OpenAPI / Health API expose many summary types we do not pull or persist: `epochs`, `stressDetails`, `pulseOx`, `respiration`, `skinTemp`, `bloodPressures`, `healthSnapshot`, `mct`, `moveiq`, `activityDetails`, `solarIntensity` (and Women’s Health separately).

Core product path uses **dailies / sleeps / hrv / activities (+ FIT)**. Body comps and userMetrics are handled when Push delivers them (after [308](./308-garmin-push-summary-keys-mismatch.md)). Expanding coverage needs product decisions (which fields map where) and must not disturb live ingest.

## Intentional subset (current)

| Ingested                                 | Source                                        |
| ---------------------------------------- | --------------------------------------------- |
| dailies, sleeps, hrv, activities (+ FIT) | Pull + Push + backfill                        |
| bodyComps, userMetrics                   | Pull + Push + backfill                        |
| stress / SpO2 / respiration averages     | From **dailies** (and sleep where applicable) |

Deferred until product asks: epochs, stressDetails, dedicated pulseOx/respiration, skinTemp, bloodPressures, healthSnapshot, mct, moveIQ, activityDetails, solarIntensity, Women’s Health.

## Affected Files

- `server/utils/garmin.ts` (`fetchGarminBodyComps`, `fetchGarminUserMetrics`, backfill types)
- `trigger/ingest-garmin.ts`
- `server/utils/services/garminService.ts` (`startBackfill`)

## Acceptance Criteria

- [x] Product decision on thin slice (bodyComps + userMetrics)
- [x] Additive ingest gated by existing wellness settings
- [x] Backfill includes bodyComps + userMetrics within 30-day window
- [ ] Further types only after explicit product request
