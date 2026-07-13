# 237 — Execution-Time Quota Failure Invisible to User

**Type:** Bug  
**Priority:** Medium  
**Area:** `chat`  
**Status:** Fixed

## Description

`checkQuota` inside `executeChatTurn` throws after the turn is claimed. Recovery treats it as a generic interruption minutes later instead of surfacing a quota-exceeded message promptly.

## Affected Files

- `server/utils/chat/turn-executor.ts`

## Acceptance Criteria

- Quota exhaustion during turn execution returns a clear, immediate failure to the client.
