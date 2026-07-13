# 244 — Nutrition Source Precedence Is Never Enforced; API Upload Wipes Manual Logs

**Type:** Bug  
**Priority:** High  
**Area:** `nutrition` (data integrity)  
**Status:** Open

## Description

`server/utils/nutrition/source-precedence.ts` defines a `MANUAL > AI > INTEGRATION >
YAZIO` precedence with `shouldOverwrite()` — but **nothing calls it** (dead code).
Related consequences:

1. `nutritionRepository.upsert(..., source)` just stamps `sourcePrecedence` and
   overwrites unconditionally.
2. `POST /api/nutrition` (`index.post.ts`) builds `mealGroups` **only** from the request
   items and upserts them as the new `breakfast/lunch/dinner/snacks`. Any partial upload
   (OAuth app, script) silently **replaces** manually logged items and totals for the
   whole day. (The Yazio ingest path is careful — `mergeYazioNutritionWithExisting`
   preserves non-Yazio items — but the generic API path is not.)
3. `metabolicService.calculateFuelingPlanForDate({ persist: true })` — which runs
   reactively after every log/patch — stamps `sourcePrecedence: 'AI'` on the record,
   clobbering whatever provenance was there. Even if precedence checks were added later,
   every record would already claim `AI`.

## Affected Files

- `server/utils/nutrition/source-precedence.ts` (dead)
- `server/utils/repositories/nutritionRepository.ts` (`upsert`)
- `server/api/nutrition/index.post.ts`
- `server/utils/services/metabolicService.ts` (`calculateFuelingPlanForDate` persist)

## Acceptance Criteria

- `POST /api/nutrition` merges items into existing meal buckets (or is explicitly
  documented + scoped as a full-day replace and guarded by precedence).
- `sourcePrecedence` reflects the item/day data source; plan regeneration does not
  overwrite it.
- `shouldOverwrite` is either used at the write sites or deleted.
