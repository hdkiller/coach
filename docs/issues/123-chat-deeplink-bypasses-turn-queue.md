# 123 — Chat Deeplink Bypasses Turn Queue

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai, chat`  
**Status:** Open

## Description

app/pages/chat.vue

## Steps to Reproduce

Enter chat via workoutId query param; typing/streaming state may desync.

## Expected Behavior

- Issue is resolved per suggested fix below.

## Actual Behavior

- See description.

## Affected Files

- See description

## Suggested Fix

Route deep-link messages through sendOutgoingMessage.

## Acceptance Criteria

- [ ] Bug no longer reproducible via steps above
- [ ] Appropriate error handling or auth in place
