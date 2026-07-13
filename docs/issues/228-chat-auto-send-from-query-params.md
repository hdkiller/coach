# 228 — Chat Auto-Sends From URL Query Params

**Type:** Bug  
**Priority:** Medium  
**Area:** `chat, security`  
**Status:** Fixed

## Description

`loadChat()` reads `initialMessage`, `workoutId`, and `recommendationId` from the query string and sends a message automatically on page load. A crafted link can inject prompts into the user's session without confirmation.

## Affected Files

- `app/pages/chat.vue`

## Acceptance Criteria

- Query params pre-fill the composer instead of auto-sending.
- Workout/recommendation context still populates suggested text.
