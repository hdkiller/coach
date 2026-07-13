# 232 — replyToId Not Validated Against Room

**Type:** Bug  
**Priority:** Medium  
**Area:** `chat`  
**Status:** Fixed

## Description

HTTP and WebSocket send paths accept `replyToId` without verifying the referenced message belongs to the same room.

## Affected Files

- `server/api/chat/messages.post.ts`
- `server/api/websocket.ts`

## Acceptance Criteria

- Invalid or cross-room `replyToId` values are rejected with 400.
