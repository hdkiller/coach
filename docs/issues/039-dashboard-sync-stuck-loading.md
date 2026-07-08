# 039 — Dashboard sync button can stay stuck in “Syncing…”

**Type:** Bug  
**Priority:** High  
**Area:** `dashboard`, `ui/ux`, `integrations`  
**Status:** Open

## Description

The dashboard “Sync Data” flow sets `syncingData = true` when `/api/integrations/sync` succeeds, but only clears it when `onTaskCompleted('ingest-all')` fires on the dashboard page. There is no `onTaskFailed` handler. If the background `ingest-all` task fails, is canceled, or completes while the user is on another page, the sync button can remain disabled/loading indefinitely.

## Root Cause

`app/stores/integrations.ts` sets `syncingData = true` on API success and only resets on API error. `app/pages/dashboard.vue` registers `onTaskCompleted('ingest-all')` to clear the flag but never listens for task failure.

## Steps to Reproduce

1. Connect at least one integration.
2. Open Dashboard and click Sync Data.
3. Let the `ingest-all` background task fail (or complete while not on the dashboard).
4. Return to Dashboard — Sync button remains in loading/disabled state.

## Expected Behavior

- Sync button resets to idle on task completion **or** failure.
- User sees an error toast when sync fails.

## Actual Behavior

- Button can stay loading until a full page reload.
- No failure feedback when the task fails after the initial API call succeeds.

## Affected Files

- `app/stores/integrations.ts`
- `app/pages/dashboard.vue`

## Suggested Fix

Register `onTaskFailed('ingest-all')` alongside `onTaskCompleted` to reset `syncingData` and show an error toast. Consider persisting sync-in-progress state server-side if cross-page recovery is needed.

## Acceptance Criteria

- [ ] `syncingData` resets on `ingest-all` failure
- [ ] User sees a failure toast when sync task fails
- [ ] Sync button is usable again without page reload
