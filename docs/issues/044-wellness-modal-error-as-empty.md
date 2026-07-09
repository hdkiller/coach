# 044 — Wellness modal mislabels API failures as “no data”

**Type:** UI  
**Priority:** Medium  
**Area:** `wellness`, `ui/ux`, `dashboard`  
**Status:** Fixed

## Description

When `fetchWellnessData()` fails (network error, 500, 403), the catch block sets `wellnessData = null` and the template shows “No wellness data available for this date” instead of an error/retry state.

## Root Cause

`app/components/WellnessModal.vue` does not distinguish fetch failure from genuinely missing data. Both paths render the same empty-state message.

## Steps to Reproduce

1. Open wellness modal from dashboard.
2. Block or fail `/api/wellness/*` requests.
3. Modal shows empty-state message, not an error.

## Expected Behavior

- Failed loads show error message with retry action.
- Empty state reserved for successful responses with no data.

## Actual Behavior

- API failures look like missing wellness data.

## Affected Files

- `app/components/WellnessModal.vue`

## Suggested Fix

Add `fetchError` ref; render error UI with retry button when set.

## Acceptance Criteria

- [x] Network/server errors show distinct error UI
- [x] Retry refetches wellness data
- [x] Genuine empty dates still show empty state
