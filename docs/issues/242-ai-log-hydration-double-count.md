# 242 — AI Food Log Double-Counts Hydration (AI Item + Regex Fallback)

**Type:** Bug  
**Priority:** High  
**Area:** `nutrition` (logging)  
**Status:** Open

## Description

`POST /api/nutrition/[id]/log` extracts fluid twice from the same query:

1. The Gemini structured parse is explicitly instructed (prompt rule 7) to return
   hydration entries as `entryType: 'HYDRATION'` with `waterMl`.
2. Independently, `extractFluidIntakeMl(query)` regex-parses the raw query text, and if
   it finds anything (`inferredFluidMl > 0`) it **unconditionally** pushes a second
   discrete "Water" item into `itemsByDate` (log.post.ts ~line 217), with no check for
   whether the AI already returned a HYDRATION item.

Logging _"drank 500ml of water"_ therefore stores **two** 500 ml water items and
credits ~1000 ml to `waterMl` / hydration debt. Combined with
[243](./243-extract-fluid-volume-container-double-count.md) a single log line can be
counted up to 4×.

The regex fallback should only fire when the AI parse produced **no** hydration entries
(its original purpose was a safety net for `parsedItems.length === 0`).

## Affected Files

- `server/api/nutrition/[id]/log.post.ts` (~lines 126, 217–245)

## Acceptance Criteria

- A query mentioning a fluid volume results in exactly one hydration item with the
  stated volume.
- Regex-inferred water item is added only when no AI-parsed HYDRATION item exists for
  the target date.
