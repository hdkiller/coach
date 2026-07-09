# 054 — `usePolling` aborts permanently on first transient error

**Type:** Bug  
**Priority:** Medium  
**Area:** `ui/ux`, `profile`  
**Status:** Fixed

## Description

On fetch error, `usePolling` calls `onError` (if provided) or logs, but does **not** schedule another attempt. Athlete profile generation polling stops after a single network blip with no recovery.

## Root Cause

```33:36:app/composables/usePolling.ts
      } catch (error) {
        if (onError) onError(error)
        else console.error('Polling error:', error)
      }
```

No retry scheduling in the catch path (unlike the success path which continues until `maxAttempts`).

## Steps to Reproduce

1. Open Athlete Profile page with status `PROCESSING`.
2. Cause one failed poll request (network blip).
3. Polling stops; profile never auto-refreshes when processing completes.

## Expected Behavior

- Transient errors retry up to `maxAttempts`.
- Terminal error only after exhausting retries.

## Actual Behavior

- Single error permanently stops polling.

## Affected Files

- `app/composables/usePolling.ts`
- `app/pages/profile/athlete.vue` (consumer)

## Suggested Fix

In catch block, increment attempts and schedule next poll if under `maxAttempts`; call `onMaxAttemptsReached` when exhausted.

## Acceptance Criteria

- [x] Transient poll errors retry
- [x] `onMaxAttemptsReached` fires after final failure
- [x] Athlete profile auto-updates when processing completes after blip
