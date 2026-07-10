# 075 — Nutrition Hydration Advice Inverted

**Type:** Bug  
**Priority:** Medium  
**Area:** `nutrition, ui/ux`  
**Status:** Fixed

> **Fixed (2026-07-09):** Reordered hydration advice thresholds in `index.vue` and centralized severity logic in `server/utils/nutrition/hydration.ts` (`getHydrationAdviceLevel`, `getHydrationAdviceSummary`).

## Description

app/pages/nutrition/index.vue

## Steps to Reproduce

View nutrition strategy with hydrationDebt 2500 vs 1600; higher debt gets milder copy.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Reorder thresholds: check severe (>1500) before high (>2000) or use correct ranges.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
