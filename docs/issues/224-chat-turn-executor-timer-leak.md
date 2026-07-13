# 224 — Chat Turn Executor Timer Leak and Stuck Rooms

**Type:** Bug  
**Priority:** High  
**Area:** `ai, chat`  
**Status:** Fixed

## Description

`executeChatTurn` creates heartbeat and execution-timeout timers before the main `try/finally` cleanup block. Early returns (approved-tool local completion) and setup-phase throws escape cleanup, leaking intervals. Setup failures leave turns `RUNNING` with a live heartbeat, so stale-turn recovery never reclaims the room.

## Affected Files

- `server/utils/chat/turn-executor.ts`
- `server/utils/chat/turn-runner.ts`

## Acceptance Criteria

- All execution paths clear heartbeat and timeout timers.
- Unhandled setup errors mark the turn terminal so the room can accept new messages.
- Approved-tool local completion no longer leaks intervals.
