# 049 — Performance “Generate Insights” stuck loading after task failure

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux`, `performance`, `dashboard`  
**Status:** Open

## Description

`generatingExplanations` is set `true` when score-explanation generation starts and only reset in `onTaskCompleted('generate-score-explanations')`. There is no `onTaskFailed` handler, so a failed background task leaves the button spinning indefinitely.

## Root Cause

`app/pages/performance/index.vue` registers completion listener only:

```1243:1243:app/pages/performance/index.vue
  onTaskCompleted('generate-score-explanations', async () => {
```

Same pattern as issue [004](./004-no-task-failure-handling.md) but on the Performance page.

## Steps to Reproduce

1. Open Performance page.
2. Click Generate Insights.
3. Let `generate-score-explanations` fail in Trigger.dev.
4. Button remains in loading state until page reload.

## Expected Behavior

- Button resets on failure with error feedback.

## Actual Behavior

- Infinite loading spinner.

## Affected Files

- `app/pages/performance/index.vue`

## Suggested Fix

Add `onTaskFailed('generate-score-explanations')` to reset state and toast error.

## Acceptance Criteria

- [ ] `generatingExplanations` resets on task failure
- [ ] User sees error toast on failure
