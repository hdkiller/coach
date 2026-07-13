# 227 — Chat Room Existence Oracle in messages.post

**Type:** Bug  
**Priority:** Medium  
**Area:** `chat, security`  
**Status:** Fixed

## Description

`messages.post` looked up the room by ID before `validateRoomAccess`, allowing callers to distinguish legacy read-only rooms (403) from non-existent/unauthorized rooms (404).

## Affected Files

- `server/api/chat/messages.post.ts`

## Acceptance Criteria

- Unauthorized and non-existent rooms return indistinguishable errors.
- Legacy read-only enforcement remains via `validateRoomAccess`.
