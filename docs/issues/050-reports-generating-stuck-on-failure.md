# 050 — Reports “New Report” stuck in generating state after task failure

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux`, `reports`  
**Status:** Open

## Description

`generating` in the reports store is cleared only via `onTaskCompleted` listeners for report tasks. Failed or canceled report jobs never reset `generating`, disabling further report creation until page reload.

## Root Cause

`app/stores/reports.ts` registers `onTaskCompleted` per task type but no `onTaskFailed` handlers.

## Steps to Reproduce

1. Open Reports.
2. Create a new report.
3. Let the background report task fail.
4. “New Report” button stays loading/disabled.

## Expected Behavior

- Generating state clears on failure; user can retry.

## Actual Behavior

- Stuck generating until reload.

## Affected Files

- `app/stores/reports.ts`
- `app/pages/reports.vue`

## Suggested Fix

Register `onTaskFailed` for each report task ID to reset `generating` and surface error.

## Acceptance Criteria

- [ ] `generating` resets on task failure
- [ ] User can create another report without reload
