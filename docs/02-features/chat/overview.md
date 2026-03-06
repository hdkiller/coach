# AI Chat System Overview

## Summary

Coach Watts chat is now a durable, turn-based system built around persisted `ChatTurn` state, in-app background execution, websocket-first delivery, and database-backed recovery.

This replaced the older request-bound chat model where the HTTP request owned the full LLM lifecycle.

## Core Architecture

The current chat stack has five layers:

- **Frontend UI**: [`app/pages/chat.vue`](/Users/hdkiller/Develop/coach-wattz/app/pages/chat.vue), [`app/components/chat/ChatMessageList.vue`](/Users/hdkiller/Develop/coach-wattz/app/components/chat/ChatMessageList.vue), and related chat components.
- **Submission API**: [`server/api/chat/messages.post.ts`](/Users/hdkiller/Develop/coach-wattz/server/api/chat/messages.post.ts) persists the triggering message and creates a `ChatTurn`.
- **Turn Execution**: [`server/utils/chat/turn-executor.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/chat/turn-executor.ts) runs the LLM/tool loop and persists incremental progress.
- **In-App Worker**: [`server/utils/chat/turn-runner.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/chat/turn-runner.ts) claims queued turns from the database and executes them inside the Node app.
- **Realtime Delivery**: websocket fanout via [`server/api/websocket.ts`](/Users/hdkiller/Develop/coach-wattz/server/api/websocket.ts) and [`server/utils/ws-state.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/ws-state.ts), with HTTP polling only as fallback.

## Persistence Model

The chat system no longer treats a message send as a single request/response operation. Each submitted message becomes a persisted turn with explicit lifecycle state.

### Main Models

- **`ChatRoom`**: conversation thread.
- **`ChatParticipant`**: room membership.
- **`ChatMessage`**: persisted user, assistant, and canonical tool messages.
- **`ChatTurn`**: durable execution record for one submitted user/tool-triggering message.
- **`ChatTurnEvent`**: append-only event log for deltas, tool lifecycle, and interruptions.
- **`ChatTurnToolExecution`**: idempotent ledger for mutating tool calls.
- **`LlmUsage`**: per-turn LLM accounting, including early in-progress records.

### `ChatTurn` Lifecycle

Non-terminal states:

- `RECEIVED`
- `QUEUED`
- `RUNNING`
- `STREAMING`
- `WAITING_FOR_TOOLS`

Terminal states:

- `COMPLETED`
- `FAILED`
- `INTERRUPTED`
- `CANCELLED`

Every message that enters execution should be associated with exactly one terminal turn outcome unless the user explicitly retries.

## Request and Execution Flow

### 1. Submission

`POST /api/chat/messages`:

- validates auth, quota, and room access
- persists the triggering user/tool message if needed
- creates a `ChatTurn`
- associates the triggering message with that turn
- enqueues the turn into the in-app DB-backed runner
- returns immediately

The HTTP request no longer owns model execution.

### 2. In-App Turn Runner

[`server/plugins/chat-turn-runner.ts`](/Users/hdkiller/Develop/coach-wattz/server/plugins/chat-turn-runner.ts) starts a singleton runner inside the app process.

The runner:

- polls for queued turns
- claims them atomically
- executes them with bounded concurrency
- runs stale-turn recovery on an interval

This keeps chat low-latency without depending on Trigger.dev for the interactive response path.

### 3. Turn Execution

[`server/utils/chat/turn-executor.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/chat/turn-executor.ts):

- reconstructs model history from persisted room state
- creates or reuses an assistant draft message
- streams text with `streamText`
- persists draft updates incrementally
- executes tools with idempotent wrappers
- writes canonical `tool` messages for tool results
- updates `ChatTurn` and `LlmUsage`
- broadcasts websocket updates

## Tool Calling

### Same-Turn Tool Use

During a live turn, tools execute inline through the AI SDK tool loop. Their results are immediately available to subsequent model steps in the same turn.

### Durable Tool History

For future turns, tool results are not reconstructed only from assistant metadata anymore.

The system now persists canonical `system_tool` chat messages so later prompts can rebuild proper `tool` history. This is more reliable than relying purely on assistant-side `output-available` parts.

Relevant files:

- [`server/utils/chat/tool-execution.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/chat/tool-execution.ts)
- [`server/utils/chat/history.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/chat/history.ts)
- [`server/utils/ai-history.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/ai-history.ts)

### Idempotency

Mutating tools are wrapped with a turn-aware execution ledger:

- duplicate delivery within the same turn is deduped by `turnId + toolCallId`
- retries across the same lineage can reuse previously completed mutating results
- side effects like planned workout creation or publishing should not repeat on retry

## Realtime Delivery

### Intended Model

The intended transport model is:

1. HTTP submits the message
2. websocket delivers `chat_assistant_text_delta` and `chat_message_upsert`
3. HTTP polling only catches up if websocket delivery is missing or reconnecting

### Current Client Behavior

The chat page:

- connects to `/api/websocket`
- authenticates with `/api/websocket-token`
- listens for live chat events
- applies text deltas to the active assistant draft
- merges persisted upserts into room state
- uses silent `GET /api/chat/messages` polling as recovery/fallback

The websocket path is primary, but polling remains important because persisted DB state is still the source of truth.

## Recovery and Resilience

### Interrupted Turns

If the process dies or a deploy interrupts execution:

- the turn remains persisted
- partial assistant draft content remains persisted
- stale active turns are later marked `INTERRUPTED`
- the UI can offer `Resume` or `Retry`

### Resume / Retry

- [`server/api/chat/turns/[id]/resume.post.ts`](/Users/hdkiller/Develop/coach-wattz/server/api/chat/turns/[id]/resume.post.ts)
- [`server/api/chat/turns/[id]/retry.post.ts`](/Users/hdkiller/Develop/coach-wattz/server/api/chat/turns/[id]/retry.post.ts)

`Resume` is for interrupted turns that can continue from existing state.

`Retry` clones the original triggering message into a new turn in the same lineage.

## Frontend UX Notes

The chat UI now differs from the older implementation in a few important ways:

- assistant waiting state is derived from durable turn state, not just the SDK request state
- the page can show a typing indicator before a final assistant message is complete
- scrolling behavior is explicitly managed in the message list
- interrupted/failed turns render recovery controls

## Important Files

Backend:

- [`server/api/chat/messages.post.ts`](/Users/hdkiller/Develop/coach-wattz/server/api/chat/messages.post.ts)
- [`server/api/chat/messages.get.ts`](/Users/hdkiller/Develop/coach-wattz/server/api/chat/messages.get.ts)
- [`server/api/chat/turns/[id]/resume.post.ts`](/Users/hdkiller/Develop/coach-wattz/server/api/chat/turns/[id]/resume.post.ts)
- [`server/api/chat/turns/[id]/retry.post.ts`](/Users/hdkiller/Develop/coach-wattz/server/api/chat/turns/[id]/retry.post.ts)
- [`server/api/websocket.ts`](/Users/hdkiller/Develop/coach-wattz/server/api/websocket.ts)
- [`server/utils/chat/turn-executor.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/chat/turn-executor.ts)
- [`server/utils/chat/turn-runner.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/chat/turn-runner.ts)
- [`server/utils/chat/history.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/chat/history.ts)
- [`server/utils/chat/tool-execution.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/chat/tool-execution.ts)
- [`server/utils/services/chatTurnService.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/services/chatTurnService.ts)

Frontend:

- [`app/pages/chat.vue`](/Users/hdkiller/Develop/coach-wattz/app/pages/chat.vue)
- [`app/components/chat/ChatMessageList.vue`](/Users/hdkiller/Develop/coach-wattz/app/components/chat/ChatMessageList.vue)
- [`app/components/chat/ChatMessageContent.vue`](/Users/hdkiller/Develop/coach-wattz/app/components/chat/ChatMessageContent.vue)

## What This Is Not

The current chat architecture is not:

- request-bound streaming from the original `POST /api/chat/messages`
- Trigger.dev-managed interactive chat execution
- assistant-metadata-only tool history
- websocket-only with no persistence fallback

It is a hybrid durable system: persisted turns first, realtime delivery second, polling as safety net.
