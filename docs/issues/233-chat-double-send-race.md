# 233 — Chat Double-Send Race

**Type:** Bug  
**Priority:** Low  
**Area:** `chat, ui/ux`  
**Status:** Fixed

## Description

`awaitingTurnStart` is set only after `sendMessage` resolves. Two rapid submits can both take the direct-send branch instead of queueing.

## Affected Files

- `app/pages/chat.vue`

## Acceptance Criteria

- Second submit while first is in-flight is queued or rejected.
