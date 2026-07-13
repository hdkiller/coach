# 251 — `analyze-nutrition` Schema Requires Nonexistent Field; QUOTA_EXCEEDED Days Never Retried

**Type:** Bug  
**Priority:** Medium  
**Area:** `nutrition` (AI analysis)  
**Status:** Open

## Description

Two defects in the nutrition AI analysis pipeline:

1. **Structured-output schema mismatch.** In `trigger/analyze-nutrition.ts` the
   `data_completeness` object declares properties `status`, `confidence`,
   `missing_meals`, `reasoningText` but requires `['status', 'confidence',
'reasoning']`. `reasoning` doesn't exist in `properties` and `reasoningText` is not
   required — depending on the model/provider this either rejects the schema, forces an
   ad-hoc `reasoning` field, or lets `reasoningText` come back undefined (the markdown
   renderer then prints `undefined`).
2. **`QUOTA_EXCEEDED` is a terminal status.** On a 429 the task sets
   `aiAnalysisStatus = 'QUOTA_EXCEEDED'`, but
   `nutritionRepository.getPendingAnalysis()` only picks up `null / NOT_STARTED /
PENDING / FAILED`. After the quota window resets, those days are never re-queued by
   "Analyze all" — they're permanently stuck unless analyzed one-by-one.

Minor (same file): the score→column mapping is semantically off —
`timingOptimizationExplanation` stores the _quality_ explanation and
`nutritionalBalanceExplanation` stores the _overall_ explanation.

## Affected Files

- `trigger/analyze-nutrition.ts` (schema ~line 99; status writes)
- `server/utils/repositories/nutritionRepository.ts` (`getPendingAnalysis`)

## Acceptance Criteria

- Schema `required` lists only declared properties (`reasoningText`).
- `QUOTA_EXCEEDED` records are picked up by subsequent bulk analysis runs.
