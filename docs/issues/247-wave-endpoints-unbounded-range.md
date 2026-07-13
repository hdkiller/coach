# 247 — Metabolic Wave Endpoints Accept Unbounded Ranges (CPU/DB Amplification)

**Type:** Bug / Performance  
**Priority:** Medium  
**Area:** `nutrition` (API)  
**Status:** Open

## Description

Both wave endpoints pass user-controlled ranges straight into the day-by-day simulator
(`getWaveRange`: 97 timeline points per day, plus upfront fetches, plus the recursive
`getMetabolicStateForDate` resolver):

- `GET /api/nutrition/extended-wave?daysAhead=N` — `parseInt` with no clamp; `N=3650`
  simulates ten years.
- `GET /api/nutrition/metabolic-wave?startDate=&endDate=` — no validation of parse
  success, ordering, or span; `endDate=2100-01-01` runs ~27k day simulations in one
  request. An invalid date string produces `NaN` day math.

Any authenticated user can tie up the server with a single request.

## Affected Files

- `server/api/nutrition/extended-wave.get.ts`
- `server/api/nutrition/metabolic-wave.get.ts`
- `server/utils/services/metabolicService.ts` (`getWaveRange` defensive cap)

## Acceptance Criteria

- `daysAhead` clamped (e.g. 1–14); range endpoints validate dates and cap the span
  (e.g. ≤ 31 days), returning 400 otherwise.
- `getWaveRange` itself refuses absurd spans as defense in depth.
