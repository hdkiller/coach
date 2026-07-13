# 245 — Carb-Loading Back-Distribution Double-Counts Window Targets (Debt Never Flows)

**Type:** Bug  
**Priority:** Medium  
**Area:** `nutrition` (upcoming fueling windows)  
**Status:** Open

## Description

`metabolicService.getUpcomingFuelingWindows` Pass 2 distributes each day's carb goal
into windows and is supposed to flow unallocatable "mega-debt" backwards to earlier days
(carb loading). The accounting is wrong:

```ts
let allocated = 0
intraWindows.forEach((w) => (allocated += w.targetCarbs))
allocated += stationaryWindows.reduce((sum, w) => sum + w.targetCarbs, 0) // counted once…

sortedStationary.forEach((w) => {
  const newAmount = Math.min(MEAL_CAP, currentAmount + baseShare)
  w.targetCarbs = Math.round(newAmount)
  allocated += w.targetCarbs // …and counted AGAIN (includes currentAmount)
})
carryOverDebt = Math.max(0, totalToAllocate - allocated)
```

Existing PRE/POST targets are included in `allocated` twice (once in the reduce, once
inside the per-window loop via `newAmount = current + share`). `carryOverDebt` is
therefore underestimated — typically clamped to 0 — so the backward carb-loading flow to
the day before a big event effectively never happens, and days whose windows are all
capped at `MEAL_CAP` silently lose the remainder instead of pushing it earlier.

Also in this pass: `remainingForStationary` is decremented inside the loop but never
used afterwards (dead bookkeeping that hides the bug).

## Affected Files

- `server/utils/services/metabolicService.ts` (`getUpcomingFuelingWindows`, Pass 2, ~lines 1360–1406)

## Acceptance Criteria

- `allocated` counts each window's final target exactly once.
- A day whose goal exceeds `windows × MEAL_CAP` produces `carryOverDebt > 0` that raises
  the previous day's distribution (unit test with a big-event scenario).
