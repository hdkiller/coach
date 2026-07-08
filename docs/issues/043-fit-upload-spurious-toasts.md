# 043 — FIT upload page toasts on unrelated background ingest jobs

**Type:** Bug  
**Priority:** Medium  
**Area:** `workouts`, `ui/ux`  
**Status:** Open

## Description

The FIT upload page registers a global `onTaskCompleted('ingest-fit-file')` listener with no correlation to the current upload batch or run IDs. Any completed FIT ingest task (from another tab, retry, or background ingest) shows “Processing Complete” on this page.

## Root Cause

`app/pages/workouts/upload.vue` listens for all `ingest-fit-file` completions without filtering by run ID or upload session.

## Steps to Reproduce

1. Open `/workouts/upload`.
2. Trigger a FIT ingest elsewhere (another tab, webhook, or retry).
3. Spurious success toast appears without uploading from this page.

## Expected Behavior

- Toasts only fire for uploads initiated from the current page/session.

## Actual Behavior

- Any global `ingest-fit-file` completion triggers the toast.

## Affected Files

- `app/pages/workouts/upload.vue`

## Suggested Fix

Track run IDs from the current upload batch and only handle completions for those runs. Unregister listener on unmount.

## Acceptance Criteria

- [ ] Unrelated FIT ingest completions do not toast on upload page
- [ ] User-initiated uploads still show completion feedback
