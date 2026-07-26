# 378 — Nutrition fueling & glycogen model overhaul

**Type:** Bug / Correctness
**Priority:** High
**Area:** `backend`, `frontend`, `mobile`, `nutrition`
**Status:** Fixed

## Description

A end-to-end review of the nutrition system found ~25 defects across window
generation, the fueling plan, meal planning, the glycogen simulation, every UI consumer, the
trigger tasks, and the mobile client. They shared one root cause: the system repeatedly discarded
information at a boundary — a semantic distinction known in one layer was flattened in the next.

Validated against production (725 athlete-days, 70,325 intervals) with a replay harness built
during the work.

## Fixed

### Window generation

| #   | Defect                                                                                                                                   | Location                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | `mergeFuelingWindows` was dead code — `mergeWindows` defaulted false and no caller passed true, so overlapping windows were never merged | `nutrition-domain/merging.ts` (deleted) |
| 2   | Windows were generated per-workout in isolation, so 3 sessions produced 9 nested windows                                                 | `nutrition-domain/day-plan.ts` (new)    |
| 3   | Fuel state came from peak intensity of any single workout — an 8-min session tagged 31 TSS forced a whole day to 479g carbs              | `resolveDayFuelState`                   |
| 4   | Intra-workout windows were emitted with 0g targets, then counted as "critical missing"                                                   | `day-plan.ts`                           |
| 5   | No sport awareness: a 60-min gym session was prescribed 75 g/h of intra-workout carbs                                                    | `resolveIntraCarbsPerHour`              |
| 6   | Rest days produced zero windows, so nothing could be planned and they counted as "complete"                                              | `day-plan.ts`                           |
| 7   | Window macros never reconciled against daily targets — 5 workouts meant 250g of protein in windows against a 1.6 g/kg goal               | `distributeCarbs/Protein/Fat`           |
| 8   | Energy cost used `FTP × IF` for every sport, meaningless for running and strength                                                        | `nutrition-domain/energy.ts` (new)      |
| 9   | Two divergent pipelines: the weekly planner used raw per-workout output while the upcoming feed had labels, caps and reconciliation      | `metabolicService`                      |

### Meal planning & persistence

| #   | Defect                                                                                                                                                                                          | Location                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 10  | `NutritionPlanMeal` is unique on `(planId, date, windowType)` and window type was the only key, so a day could hold exactly one `PRE_WORKOUT` meal — draft generation silently overwrote 4 of 5 | `nutritionPlanService`          |
| 11  | Meal↔window matching was by type, so one locked meal marked every same-type window planned                                                                                                      | `matchPlanMealToWindow`         |
| 12  | `targetKcal` was consumed in 3 places but never produced — every window showed "0 KCAL"                                                                                                         | `day-plan.ts`                   |
| 13  | `mapWindowTypeToCatalogType` didn't handle `DAILY_BASE:breakfast`, so those never matched the catalog and always fell through to the LLM                                                        | `mealRecommendationService`     |
| 14  | Catalog had zero `INTRA` templates                                                                                                                                                              | `cli/nutrition/seed-catalog.ts` |
| 15  | Draft generation always picked `catalogOptions[0]` — the same meal in every window                                                                                                              | `nutritionPlanService`          |
| 16  | Meal totals came from `baseMacros × scale` while ingredients were rounded separately, so displayed macros drifted from the recipe                                                               | `selectFromCatalog`             |
| 17  | No day-budget awareness; suggestions could sum past the daily target                                                                                                                            | `mealRecommendationService`     |
| 18  | LLM responses were never validated against allergies or targets, and no fat target was passed                                                                                                   | `generateLlmRecommendation`     |
| 19  | Every suggest click created a record and a model run, with no dedupe                                                                                                                            | `recommendations/meal.post.ts`  |

### Glycogen simulation

| #   | Defect                                                                                                                                                                                                                | Location                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 20  | `getAbsorbedInInterval` applied the midpoint rule across the whole elapsed span. A 60g meal reported **92g absorbed at 3h**, decaying to 4g by 10h — non-monotonic and unbounded. This fed the glycogen tank directly | `absorption.ts`                                    |
| 21  | The gut absorption cap limited carbohydrate but let the full calorie load through — **11.9 kcal/g** credited instead of 4                                                                                             | `metabolic-simulation.ts`                          |
| 22  | The session drain uplift applied to carbs but not calories, so a workout's calorie cost read 25% low                                                                                                                  | `metabolic-simulation.ts`                          |
| 23  | Resting drain took carbs from bare BMR but calories from BMR × 1.2                                                                                                                                                    | `metabolic-simulation.ts`                          |
| 24  | Drain table was a step function — IF 0.899 vs 0.901 differed by 64%                                                                                                                                                   | `getGramsPerMin`                                   |
| 25  | Drain was sport-blind: an hour in the gym cost the same as an hour of hard riding                                                                                                                                     | `getGramsPerMin`                                   |
| 26  | Glycogen capacity scaled on bodyweight, crediting a 100kg athlete at 30% body fat with 800g                                                                                                                           | `resolveGlycogenCapacityG`                         |
| 27  | The "safety floor" forced any start ≤0% up to 60%, **inventing 60 points of glycogen overnight**                                                                                                                      | `calculateEnergyTimeline`                          |
| 28  | The chain carried unmeasured deficits forward, so a run of unlogged days left an athlete permanently empty                                                                                                            | `carryForwardGlycogen`                             |
| 29  | **Past days with no logged food were modelled as fasting.** With 1% of production days carrying logged food this bottomed out 49% of all training days                                                                | `calculateEnergyTimeline`                          |
| 30  | Future days were projected at `fuelState1Min` — the lowest fuel state's minimum — regardless of what was scheduled                                                                                                    | `getWaveRange`, `getDailyTimeline`                 |
| 31  | `DAILY_BASE` windows were double-counted once the plan started emitting them                                                                                                                                          | `metabolic-simulation.ts`, `nutrition-timeline.ts` |

### UI consumers

| #   | Defect                                                                                                            | Location                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 32  | Weekly plan sorted windows by type, rendering a two-session day as PRE PRE INTRA INTRA POST POST                  | `WeeklyPlanDashboard.vue`                                   |
| 33  | Fuel state recomputed from absolute carb thresholds (360/220g), contradicting the server for anyone not ~75kg     | `WeeklyPlanDashboard.vue`                                   |
| 34  | Day drawer held a snapshot taken at click time, so opening it before the plan loaded left it permanently empty    | `WeeklyPlanDashboard.vue`                                   |
| 35  | "Plan sync age" measured `plan.updatedAt`, which changes on every meal lock                                       | `WeeklyPlanDashboard.vue`                                   |
| 36  | Fluid Balance derived workout hours by summing intra windows, under-reporting once those became conditional       | `HydrationExplainModal.vue`                                 |
| 37  | Fuel state parsed out of an intra-window description string in three places                                       | `[id].vue`, `planned/[id]/index.vue`, `CalendarDayCell.vue` |
| 38  | Calories modal breakdown didn't sum to the displayed target when the macro floor won                              | `MacroExplainModal.vue`                                     |
| 39  | Upcoming Plan locked meals without a window key — same collapse as #10                                            | `UpcomingFuelingFeed.vue`                                   |
| 40  | Charts detected synthetic meals by string-matching the label; the tooltip asserted "Food Logged" on inferred data | `MultiDayEnergyChart.vue`, `LiveEnergyChart.vue`            |
| 41  | Inferred stretches of the curve rendered identically to measured ones                                             | both charts, mobile `EnergyHorizonChart.tsx`                |
| 42  | Timeline's "hide empty windows" would hide baseline windows carrying a target                                     | `FuelingTimeline.vue`                                       |

### Triggers

| #   | Defect                                                                                                             | Location                                 |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| 43  | Post-workout recovery boost wrote to the **first** post window, so a hard evening session boosted the morning meal | `trigger/adjust-fueling-post-workout.ts` |
| 44  | Evening nudge read the wrong window's status on two-session days (task currently disabled)                         | `trigger/nutrition-last-call.ts`         |

### Mobile

| #   | Defect                                                                             | Location       |
| --- | ---------------------------------------------------------------------------------- | -------------- |
| 45  | `mapNutritionPlan.ts` is a hand-port of the web logic and carried #11, #32 and #39 | `watts-mobile` |

## Production validation

A replay harness (`pnpm cli nutrition replay-model --prod`) measures the model against real
athlete-days. Clipping rate is the headline: whenever the tank pins at 0% or 100% the model has
saturated and thrown information away.

| Metric                      | Before                  | After                  |
| --------------------------- | ----------------------- | ---------------------- |
| Intervals pinned at 0%      | 22.8%                   | **0.1%**               |
| Intervals pinned at 100%    | 0%                      | **1.1%**               |
| Training days bottoming out | **49%**                 | **9%**                 |
| Rest days bottoming out     | 4%                      | 0%                     |
| Chain handoff error (p90)   | 60 pts                  | **0 pts**              |
| Daily minimum distribution  | degenerate spike at 33% | spread, centred 50-59% |

## Notes

The intake fix took three attempts, each caught by the harness: assuming full plan adherence pinned
31% of intervals at 100%; a leak through `synthesizeRefills` kept it at 30%. The principle settled
on is **absence of evidence means absence of movement** — an unlogged day is modelled at energy
balance, so the tank ends where it began and only training moves it.

Because the curve is now mostly inference, provenance (`logged` / `assumed` / `projected`) travels
from the simulation through both wave endpoints to both platforms' charts, and inferred stretches
render dashed with an explicit label.
