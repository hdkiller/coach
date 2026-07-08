# 055 — Communication preferences load failure shows misleading defaults

**Type:** UI  
**Priority:** Medium  
**Area:** `ui/ux`, `profile`, `settings`  
**Status:** Open

## Description

If `/api/profile/email-preferences` fails on mount, the catch block only logs. The form renders with hardcoded defaults (all notifications enabled) that may not match the user’s actual preferences, with no error state. Saving could unintentionally overwrite real preferences.

## Root Cause

`app/components/profile/CommunicationSettings.vue` does not surface load errors or disable the form when preferences fail to fetch.

## Steps to Reproduce

1. Open Profile → Communication tab.
2. Fail preferences GET request.
3. Form shows all toggles at default positions.
4. User saves, potentially overwriting server preferences.

## Expected Behavior

- Error state with retry when load fails.
- Form disabled until real preferences load.

## Actual Behavior

- Misleading defaults with no error indication.

## Affected Files

- `app/components/profile/CommunicationSettings.vue`

## Suggested Fix

Track `loadError`; show error banner and disable save until successful fetch.

## Acceptance Criteria

- [ ] Failed load shows error UI, not defaults
- [ ] Save disabled until preferences loaded
- [ ] Retry successfully loads preferences
