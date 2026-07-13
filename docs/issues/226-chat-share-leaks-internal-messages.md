# 226 — Public Chat Share Leaks Internal Messages

**Type:** Bug  
**Priority:** High  
**Area:** `chat, privacy`  
**Status:** Fixed

## Description

`/api/share/chat/[token]` returns every room message with no filtering. `system_tool` messages appear as user messages; hidden drafts and failed turns are included; raw `metadata.parts` exposes tool calls and approval data.

## Affected Files

- `server/api/share/chat/[token].get.ts`
- `server/utils/share-response.ts` (or shared chat sanitizer)

## Acceptance Criteria

- Tool/system messages excluded from public share payload.
- Hidden assistant drafts and empty failures excluded.
- Only user-visible text content exposed in shared parts.
