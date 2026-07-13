# 250 — `finalizeDay` Simulates a Different Day Than `getDailyTimeline` (Handoff Checks Can't Pass)

**Type:** Bug  
**Priority:** Medium  
**Area:** `nutrition` (metabolic chain)  
**Status:** Open

## Description

`metabolicService.finalizeDay()` computes a day's ending state from **completed
workouts only** (`workoutRepository.getForUser`) with **no synthetic meals**, while
`getDailyTimeline()` / `getWaveRange()` — the paths whose outputs the chain-consistency
checks compare against — include uncompleted planned workouts
(`selectRelevantWorkouts`) and synthesized refills for today/future.

Consequences once the finalize path runs (see [239](./239-metabolic-chain-never-persisted.md)):

- `endingGlycogenPercentage` persisted by `finalizeDay` will routinely differ by more
  than the ±1 % tolerance from what `getMetabolicStateForDate` simulates for the same
  day, so its "consistent handoff" fast-path never engages and every request falls back
  to re-simulation anyway.
- `finalizeDay` also seeds its starting state directly from
  `yesterdayRecord.endingGlycogenPercentage ?? floor` without repairing/resolving the
  chain, unlike every other consumer.

Both calculators should delegate to one canonical "simulate day N with policy P"
function, with an explicit policy for whether skipped planned workouts count on past
days.

## Affected Files

- `server/utils/services/metabolicService.ts` (`finalizeDay`, `getDailyTimeline`, `getMetabolicStateForDate`)

## Acceptance Criteria

- One shared day-simulation path; `finalizeDay`'s persisted ending state matches
  `getDailyTimeline`'s last point for the same inputs.
