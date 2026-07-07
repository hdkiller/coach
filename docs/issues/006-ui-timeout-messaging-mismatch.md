# 006 — UI timeout messaging mismatch

**Type:** Bug  
**Priority:** Low  
**Area:** `ui/ux`, `workouts`  
**Status:** Open

## Description

The Planned Workout Details page tells users structure generation "may take up to **30 seconds**", but the actual pipeline can take significantly longer.

## Actual Timings

| Layer | Limit |
|-------|-------|
| AI call per attempt | 45s (`STRUCTURED_WORKOUT_TIMEOUT_MS`) |
| Retry attempts | Up to 2 (Flash → Pro with high thinking) |
| Coverage/strength validation retries | Additional loop iterations inside attempt budget |
| Trigger.dev task `maxDuration` | 180s |
| Post-AI processing | Strength library matching, normalization, Intervals sync |

Worst case: ~90s+ of AI time alone, plus processing — up to the **180s task cap**.

## Location

```2336:2339:app/pages/workouts/planned/[id]/index.vue
      toast.add({
        title: 'Generation Started',
        description: 'AI is generating the workout structure. This may take up to 30 seconds.',
```

## Expected Behavior

Copy should reflect realistic timing (e.g. "up to 2 minutes") or use indeterminate progress messaging tied to run status.

## Suggested Fix

- Update toast copy to match 180s cap or show run-linked progress.
- Consider showing attempt/retry state if exposed in run metadata.

## Acceptance Criteria

- [ ] User-facing timing expectations align with backend limits
