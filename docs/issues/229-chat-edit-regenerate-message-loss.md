# 229 — Edit-and-Regenerate Can Lose User Message

**Type:** Bug  
**Priority:** Medium  
**Area:** `chat`  
**Status:** Fixed

## Description

The regenerate flow deletes the edited message and everything after it, then relies on the client to re-send the edited text. Network failure between PATCH and re-send loses the message entirely.

## Affected Files

- `server/api/chat/messages/[id].patch.ts`
- `app/pages/chat.vue`

## Acceptance Criteria

- Server atomically applies edited content and enqueues regeneration, or client retains unsent text until confirmed persisted.
