# 257 — Strategy/Upcoming Endpoints Recompute Fueling Plans Dozens of Times Per Page Load

**Type:** Performance  
**Priority:** Medium  
**Area:** `nutrition` (API)  
**Status:** Open

## Description

A single load of `/nutrition` fires four endpoints that independently re-derive the
same data:

- `GET /api/nutrition/strategy` — loops **7 sequential**
  `calculateFuelingPlanForDate()` calls (each: 2 workout queries + user + settings +
  override lookup), then `getWaveRange` over 4 days (which itself starts with the
  recursive `getMetabolicStateForDate`, see [239](./239-metabolic-chain-never-persisted.md)).
- `GET /api/nutrition/upcoming-plan` → `getUpcomingFuelingWindows` — another
  `getWaveRange` probe just for hydration debt, then **7 more**
  `calculateFuelingPlanForDate()` + per-day `nutritionPlan.findFirst`.
- `GET /api/nutrition/active-feed` → `getMealTargetContext` → `getMetabolicStateForDate`
  - `getDailyTimeline` + possibly another `calculateFuelingPlanForDate`.
- `GET /api/nutrition/extended-wave` — 5 more simulated days.

Inside `calculateFuelingPlanForDate` itself, the "dominant fuel state" reduce calls
`calculateFuelingStrategy(profile, ctx)` a **second time per context** purely to read
`fuelState` that the first pass already produced.

Also duplicated logic: `getWaveRange` and `getMetabolicStatesForRange` are near-copies
(UTC grouping, synthesis policy) that must be kept in sync by hand.

## Affected Files

- `server/api/nutrition/strategy.get.ts`
- `server/utils/services/metabolicService.ts` (`getUpcomingFuelingWindows`,
  `calculateFuelingPlanForDate`, `getWaveRange`, `getMetabolicStatesForRange`)

## Acceptance Criteria

- Fueling plans for a date range computed in one batched pass (single upfront data
  fetch), reused across strategy/upcoming/feed within a request (or short-lived cache).
- Dominant-state reduce reuses the plans already computed.
