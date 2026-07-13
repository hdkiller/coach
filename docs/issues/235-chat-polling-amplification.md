# 235 — Chat Polling Amplification During Active Turns

**Type:** Bug  
**Priority:** Low  
**Area:** `chat, performance`  
**Status:** Fixed

## Description

Room-state signature includes `activeTurnUpdatedAt`, which changes on every heartbeat. During active turns the 1.5s poll triggers full `loadMessages` almost every tick with no pagination.

## Affected Files

- `app/pages/chat.vue`
- `server/api/chat/messages.get.ts`

## Acceptance Criteria

- Heartbeat updates do not trigger full history refetch.
- Polling remains correct for turn completion and approvals.
