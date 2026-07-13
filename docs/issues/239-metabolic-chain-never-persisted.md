# 239 — Metabolic Chain State Is Never Persisted in Production

**Type:** Bug / Architecture  
**Priority:** High  
**Area:** `nutrition` (metabolic chain)  
**Status:** Open

## Description

The glycogen/fluid "chain" (`startingGlycogenPercentage`, `endingGlycogenPercentage`,
`startingFluidDeficit`, `endingFluidDeficit` on `Nutrition`) has two writers — and
neither runs in production:

- `metabolicService.repairMetabolicChain()` (the only function that persists chain
  handoffs) is referenced **only from CLI debug tools** (`cli/nutrition/chain.ts`,
  `cli/nutrition/debug-metabolic.ts`, `cli/debug/chart.ts`).
- `trigger/finalize-daily-nutrition.ts` (which calls `metabolicService.finalizeDay()`)
  is defined but **never triggered or scheduled** — no `tasks.trigger('finalize-daily-nutrition')`
  or cron exists anywhere. Its own footer comment admits this: _"Schedule this to run
  for all active users daily"_.

Consequences:

1. `getMetabolicStateForDate()` almost always finds no cached starting state and
   recursively re-simulates **up to 5 previous days** (each with its own workout,
   nutrition, settings, weight-resolver and journey-event queries) on every call.
   It is called by `/api/nutrition/extended-wave`, `/api/nutrition/metabolic-wave`,
   `/api/nutrition/strategy`, `/api/nutrition/active-feed`, `simulate-impact`, and
   `getMealTargetContext` — i.e. several times per dashboard load.
2. The ±1 % "consistent handoff" fast-paths in `getMetabolicStateForDate` /
   `repairMetabolicChain` can never hit, because the DB columns stay `null`.
3. The only production writer of `startingGlycogenPercentage` is
   `/api/nutrition/hydration-reset`, which writes a value that nothing else maintains.
4. `finalizeDay`'s downstream `checkCriticalAlerts` (see [240](./240-check-critical-alerts-stubbed.md))
   is dead as well.

Either schedule the finalize/repair path (e.g. daily cron per active user, or
opportunistic repair on first request of the day) or remove the persistence columns and
embrace pure on-the-fly simulation with a bounded window — the current half-state pays
the complexity cost of both designs and gets the benefit of neither.

## Affected Files

- `server/utils/services/metabolicService.ts` (`repairMetabolicChain`, `finalizeDay`, `getMetabolicStateForDate`)
- `trigger/finalize-daily-nutrition.ts`

## Acceptance Criteria

- Chain state is persisted by a scheduled/production code path, or the recursive
  resolver is redesigned with an explicit bounded simulation window.
- Dashboard endpoints stop re-simulating multiple days per request.
