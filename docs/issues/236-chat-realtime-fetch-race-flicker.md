# 236 — Realtime Delta vs HTTP Refresh Race

**Type:** Bug  
**Priority:** Low  
**Area:** `chat, ui/ux`  
**Status:** Fixed

## Description

`applyAssistantTextDelta` appends to local content while `loadMessages` replaces the list with a fetch snapshot. Late responses can briefly regress streamed text before self-healing.

## Affected Files

- `app/pages/chat.vue`

## Acceptance Criteria

- Streamed text never visibly regresses during concurrent fetch.
