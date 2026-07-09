# 046 — Profile settings show stale values after failed save

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux`, `profile`  
**Status:** Fixed

## Description

`handleProfileUpdate()` applies `Object.assign(profile.value, newProfile)` before the PATCH request. On validation or server failure, the UI keeps unsaved edits with only an error toast — no rollback to the last known server state.

## Root Cause

```321:323:app/pages/profile/settings.vue
  async function handleProfileUpdate(newProfile: any) {
    Object.assign(profile.value, newProfile)
    savingProfile.value = true
```

No rollback in the `catch` block.

## Steps to Reproduce

1. Open Profile Settings.
2. Change a field to an invalid value.
3. Save.
4. Validation error toast appears; form still displays the invalid value as if saved.

## Expected Behavior

- On failure, form reverts to last successful server values.
- Or: optimistic update only after success.

## Actual Behavior

- Failed edits remain visible in the form.

## Affected Files

- `app/pages/profile/settings.vue`

## Suggested Fix

Snapshot `profile.value` before assign; restore snapshot on catch. Alternatively, apply changes only after successful PATCH.

## Acceptance Criteria

- [x] Failed save restores previous field values
- [x] Successful save still updates UI immediately
