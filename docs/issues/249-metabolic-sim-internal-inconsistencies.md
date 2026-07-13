# 249 — Metabolic Simulation Internal Inconsistencies (Drain, Absorption Cap, Field Precedence)

**Type:** Bug  
**Priority:** Medium  
**Area:** `nutrition` (metabolic simulation)  
**Status:** Open

## Description

A cluster of small inconsistencies in `metabolic-simulation.ts` /
`calculateGlycogenState` vs `calculateEnergyTimeline` that make the tank %, kcal
balance, and per-day handoffs drift apart:

1. **1.25× workout multiplier applied to grams but not kcal.** The timeline loop drains
   `drainGramsPerInterval * 1.25` carbs but `drainKcalPerInterval` un-multiplied, and the
   event marker on the chart shows the un-multiplied `-drainGramsPerInterval`. Carb and
   kcal balances diverge for the same workout.
2. **Absorption cap discards carbs instead of deferring them.** Intake is capped at
   22.5 g/15 min (90 g/h) via `Math.min(intervalGramsIn, 22.5)`, but the excess is
   simply lost — a large dinner "disappears" from glycogen instead of absorbing over
   more intervals. Meanwhile `intervalKcalIn` is **not** capped, so kcal and carb
   balances disagree again.
3. **Starting-percentage floor asymmetry.** `calculateEnergyTimeline` floors
   `startingPct <= 0` to `metabolicFloor * 100`; `calculateGlycogenState` uses a passed
   `startingPercentage` of 0 as-is. A corrupted chain start renders 0 % in one place and
   60 % in the other.
4. **Field-precedence divergence.** Intensity: glycogen state uses
   `intensity || workIntensity || 0.7`; timeline uses
   `workIntensity || intensityFactor || intensity || 0.7`. Duration: glycogen state uses
   `duration || durationSec || plannedDuration`; timeline uses
   `durationSec || duration || plannedDuration`. Same workout can drain differently in
   the two calculations feeding one response (`getDailyTimeline` returns points from one
   and `breakdown` from the other).
5. **Default start-time mismatch.** `getWorkoutDate()` defaults a time-less workout to
   10:00 **local** (`fromZonedTime`), while `calculateFuelingStrategy` defaults to
   `workout.date + 10h` = 10:00 **UTC**. For non-UTC users the fueling windows and the
   simulated drain are offset by the UTC offset.
6. **Sweat-rate band gap.** `SWEAT_RATE_LOOKUP_TABLE` bands are `≤9.9` then `≥10` etc.;
   a temperature of 9.95 matches nothing and falls back to the 18–26 °C band (warmer
   rates for near-freezing rides).

## Affected Files

- `server/utils/nutrition-domain/metabolic-simulation.ts`
- `server/utils/nutrition-domain/workout.ts`
- `server/utils/nutrition-domain/fueling-plan.ts` (default `startTime`)
- `server/utils/nutrition/sweat-rate.ts`

## Acceptance Criteria

- Single shared helpers for workout intensity/duration/start-time resolution used by
  both calculators.
- kcal and carb drains/intakes use the same multipliers and caps; capped absorption is
  deferred, not discarded.
- Band lookup uses half-open ranges with no gaps.
