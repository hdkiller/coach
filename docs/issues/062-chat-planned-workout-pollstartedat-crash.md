# 062 — `ChatPlannedWorkoutCard` references undeclared `pollStartedAt` (runtime crash)

**Type:** Bug  
**Priority:** Critical  
**Area:** `ai`, `chat`, `ui/ux`  
**Status:** Fixed

## Description

`checkStructureWaitTimeout()` and `startPolling()` read/write `pollStartedAt.value`, but `pollStartedAt` is never declared with `ref()`. Any poll cycle that hits the structure-wait timeout path throws a `ReferenceError`, breaking status polling for planned-workout tool cards in chat.

## Root Cause

```431:447:app/components/chat/ChatPlannedWorkoutCard.vue
  const checkStructureWaitTimeout = () => {
    ...
    !pollStartedAt.value
    ...
    return Date.now() - pollStartedAt.value > STRUCTURE_WAIT_TIMEOUT_MS
  }

  const startPolling = async () => {
    clearPolling()
    pollStartedAt.value = Date.now()
```

No `const pollStartedAt = ref(...)` exists in the script setup block.

## Steps to Reproduce

1. Open chat with a planned-workout tool card awaiting structure.
2. Wait for structure-wait timeout path or trigger polling.
3. Console shows `ReferenceError: pollStartedAt is not defined`; card stops updating.

## Expected Behavior

- Polling tracks start time and times out gracefully.

## Actual Behavior

- Runtime crash in chat tool card polling.

## Affected Files

- `app/components/chat/ChatPlannedWorkoutCard.vue`

## Suggested Fix

Add `const pollStartedAt = ref<number | null>(null)` and reset in `clearPolling()`.

## Acceptance Criteria

- [x] No ReferenceError during structure-wait polling
- [x] Timeout path surfaces terminal UI state
