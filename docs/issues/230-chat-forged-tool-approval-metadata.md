# 230 — Client Can Persist Forged Tool Approval Metadata

**Type:** Bug  
**Priority:** Medium  
**Area:** `chat, security`  
**Status:** Fixed

## Description

`messages.post` persists client-supplied `parts` into `metadata.toolResponse` for tool-role approval responses. While execution uses server-side args, forged metadata can pollute stored history replayed into LLM prompts.

## Affected Files

- `server/api/chat/messages.post.ts`
- `server/utils/chat/history.ts`

## Acceptance Criteria

- Only server-generated approval response shapes are persisted.
- Client cannot inject arbitrary tool-result parts via POST.
