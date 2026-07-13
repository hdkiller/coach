# 258 — `getWaveRange` Groups Workouts by UTC Date, Not Local Day

**Type:** Bug  
**Priority:** Medium  
**Area:** `nutrition` (metabolic wave)  
**Status:** Open

## Description

`getWaveRange` (and its twin `getMetabolicStatesForRange`) fetch workouts with
timezone-aware range bounds (`getStartOfDayUTC(timezone, …)`) but then bucket them per
day with the **UTC** date key:

```ts
const key = date.toISOString().split('T')[0] // w.date is a UTC timestamp
```

Completed workouts carry real timestamps. For a user in UTC+2, a ride at 00:30 local
Saturday (22:30 UTC Friday) is keyed to Friday — its glycogen drain lands on the wrong
simulated day, and near-midnight rides can disappear from "today's" wave entirely for
negative-offset users. The single-day path (`getRelevantWorkouts` → repository range
query) handles this correctly; only the range groupers are wrong. Nutrition records are
stored at UTC midnight so `n.date.toISOString()` is fine — the bug is specifically the
workout grouping.

Same UTC-vs-local mismatch exists in `calculateFuelingPlanForDate`, which queries
planned/completed workouts with raw UTC day bounds (`setUTCHours(0,0,0,0)`) instead of
the user-timezone day.

## Affected Files

- `server/utils/services/metabolicService.ts` (`getWaveRange` ~line 887,
  `getMetabolicStatesForRange` ~line 1557, `calculateFuelingPlanForDate` ~line 996)

## Acceptance Criteria

- Workouts bucketed with `getDateKey(w.date, timezone)` (local day) consistently across
  range simulators and the fueling-plan day query.
- Test: completed workout at 00:30 local (+2 TZ) drains the correct simulated day.
