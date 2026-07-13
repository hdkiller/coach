# 248 — `simulate-impact` Endpoint Has No Input Validation

**Type:** Bug  
**Priority:** Low  
**Area:** `nutrition` (API)  
**Status:** Open

## Description

`POST /api/nutrition/simulate-impact` reads `body.carbs`, `body.date`, `body.time`
without any schema (every sibling endpoint uses zod):

- missing/non-numeric `carbs` → `totalCarbs: undefined`, `totalKcal: NaN` propagate into
  the ghost-meal timeline (NaN points in the chart response);
- no bounds on `carbs` (negative or 100000 accepted);
- invalid `date`/`time` strings become `Invalid Date` and feed `getMetabolicStateForDate`.

## Affected Files

- `server/api/nutrition/simulate-impact.post.ts`

## Acceptance Criteria

- zod schema: `carbs` finite 0–1000, `absorptionType` enum, optional valid `date`
  (YYYY-MM-DD) and `time` (ISO); 400 on violation.
