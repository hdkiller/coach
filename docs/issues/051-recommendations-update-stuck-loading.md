# 051 — Recommendations “Update” spinner stuck after failed generation

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux`, `planning`, `recommendations`  
**Status:** Fixed

## Description

`refreshingAdvice` is cleared on `onTaskCompleted('generate-recommendations')` but not on task failure. A failed job leaves the Update button spinning with no terminal error state.

## Root Cause

`app/pages/recommendations/index.vue` only listens for completion:

```251:251:app/pages/recommendations/index.vue
  onTaskCompleted('generate-recommendations', async () => {
```

No `onTaskFailed` registered.

## Steps to Reproduce

1. Open Recommendations.
2. Click Update Recommendations.
3. Let `generate-recommendations` fail.
4. Update button keeps showing loading state.

## Expected Behavior

- Spinner clears on failure; error toast shown.

## Actual Behavior

- Stuck loading until page reload.

## Affected Files

- `app/pages/recommendations/index.vue`
- `app/stores/recommendations.ts`

## Suggested Fix

Add `onTaskFailed('generate-recommendations')` handler to reset `refreshingAdvice` and show error.

## Acceptance Criteria

- [x] Update button resets on task failure
- [x] User receives actionable error feedback
