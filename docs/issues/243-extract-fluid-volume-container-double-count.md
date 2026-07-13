# 243 — `extractFluidIntakeMl` Adds Explicit Volume AND Container Estimate for the Same Drink

**Type:** Bug  
**Priority:** Medium  
**Area:** `nutrition` (hydration parsing)  
**Status:** Open

## Description

`extractFluidIntakeMl` in `server/utils/nutrition/hydration.ts` sums two independent
passes over the text:

- explicit volumes: `/(\d+...)(ml|l|oz|...)/` → _"500ml"_ → +500
- container words: `/\b(large|medium|small)?\s*(bottle|glass|cup|flask)\b/` →
  _"bottle"_ → +500

For the very common phrasing _"a 500ml bottle of water"_ both passes match, returning
**1000 ml** for a 500 ml drink. Container-based estimation should only apply to
containers that don't have an adjacent explicit volume (or simply be skipped whenever
any explicit volume was found).

## Affected Files

- `server/utils/nutrition/hydration.ts` (`extractFluidIntakeMl`, ~lines 78–104)

## Acceptance Criteria

- `"a 500ml bottle of water"` → 500.
- `"a bottle of water"` → 500 (container estimate still works alone).
- `"500ml + a glass of water"` → 750 (independent mentions still sum).
