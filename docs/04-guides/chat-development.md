# Chat Development Guide

This guide describes the current rules for modifying Coach Watts chat.

The main constraint is simple: chat is no longer a single HTTP request/response flow. It is a durable workflow built around persisted `ChatTurn` state, in-app execution, websocket delivery, and database-backed recovery.

## 1. Mental Model

When a user sends a message:

1. the triggering message is persisted
2. a `ChatTurn` is created
3. the app runner claims and executes that turn
4. assistant drafts, tool results, and turn state are persisted incrementally
5. websocket events deliver live updates
6. HTTP message reloads act as recovery/fallback

Do not design chat code as if the request itself owns the entire response lifecycle.

## 2. Source of Truth

There are three different representations in the system, and they are not interchangeable.

### Persisted Chat History

Stored in the database as:

- `ChatMessage`
- `ChatTurn`
- `ChatTurnEvent`
- `ChatTurnToolExecution`

This is the recovery source of truth.

### UI Message State

Used by the page and chat components.

- optimistic user messages may exist briefly
- realtime deltas may update drafts before the next DB fetch
- UI must be able to recover from DB state at any time

### Model History

Used only for LLM execution.

- built from persisted room history
- normalized before sending to the model
- must preserve valid assistant/tool sequencing

## 3. Message Rules

### `ChatMessage`

Persisted roles in practice:

- `user`
- `assistant` (`senderId = ai_agent`)
- canonical `tool` (`senderId = system_tool`)

### Tool Results

Do not rely only on assistant metadata for tool history.

Tool results must be durably representable as canonical tool messages so future turns can rebuild valid model context.

Relevant files:

- [`server/utils/chat/history.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/chat/history.ts)
- [`server/utils/ai-history.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/ai-history.ts)
- [`server/utils/services/chatTurnService.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/services/chatTurnService.ts)

## 4. Turn Lifecycle Rules

All execution-aware changes must respect `ChatTurn` lifecycle state.

Active states:

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

Rules:

- do not leave turns without a terminal outcome
- interrupted turns must remain resumable or retryable
- partial assistant content should be persisted, not lost
- UI typing state should follow turn state, not just transport state

## 5. Tool Calling Rules

### Live Turn

Within the same turn, tool results are returned directly into the model loop via the AI SDK tool system.

### Future Turns

For later context reconstruction, canonical tool messages must exist in persisted history.

### Idempotency

Mutating tools must remain idempotent across retries and restarts.

Use the turn-aware execution ledger:

- [`server/utils/chat/tool-execution.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/chat/tool-execution.ts)

Do not add a mutating chat tool without checking:

- stable `toolCallId`
- lineage-aware idempotency behavior
- retry behavior
- duplicate side-effect safety

## 6. History Normalization Rules

Before sending history to the model:

1. remove invalid or duplicate assistant-side tool outputs if canonical tool messages exist
2. preserve valid assistant/tool ordering
3. merge consecutive roles where needed
4. avoid empty invalid message content
5. strip broken/orphan tool-call sequences if they would violate provider rules

Do not manually handcraft Gemini tool sequencing in random endpoints. Use the existing normalization helpers.

## 7. Transport Rules

### Current Intent

The intended chat transport model is:

- HTTP for submission
- websocket for live deltas and upserts
- HTTP polling only as fallback

### Important Consequence

A connected websocket is not the same as healthy chat realtime.

Chat polling should only back off when actual `chat_*` websocket events are being received, not merely because the socket is open.

Relevant files:

- [`server/utils/ws-state.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/ws-state.ts)
- [`server/api/websocket.ts`](/Users/hdkiller/Develop/coach-wattz/server/api/websocket.ts)
- [`app/pages/chat.vue`](/Users/hdkiller/Develop/coach-wattz/app/pages/chat.vue)

## 8. Frontend Rules

### Status

Do not trust `chat.status` alone for assistant progress.

The frontend may submit via the AI SDK transport, but the real assistant lifecycle is now detached and driven by persisted turn state.

### Realtime Merge

Client merge logic must:

- accept realtime text deltas
- merge persisted upserts
- avoid regressing terminal turn states back to active states
- avoid duplicate assistant drafts
- recover cleanly from a full room reload

### Typing Indicator

Typing state should disappear when:

- no active turn remains, and
- the temporary post-submit waiting gap has been cleared

### Scroll

Scrolling should react to:

- new user messages
- assistant text deltas
- tool-call/result updates
- typing-indicator appearance/disappearance

Do not key scroll behavior only off message count.

## 9. In-App Runner Rules

Interactive chat execution now happens in the app process, not Trigger.dev.

When modifying the runner:

- maintain atomic queue claim behavior
- keep bounded concurrency
- preserve stale-turn recovery
- avoid request-coupled execution assumptions

Relevant files:

- [`server/utils/chat/turn-runner.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/chat/turn-runner.ts)
- [`server/plugins/chat-turn-runner.ts`](/Users/hdkiller/Develop/coach-wattz/server/plugins/chat-turn-runner.ts)

## 10. When You Change Chat

If you touch chat logic, check these areas explicitly:

1. submit path
2. turn creation / dedupe
3. runner claim / execution
4. websocket event delivery
5. polling fallback
6. tool idempotency
7. history reconstruction
8. typing/scroll UX
9. retry/resume flow

If you only check one layer, you will miss regressions.

## 11. Files to Read First

Backend:

- [`server/api/chat/messages.post.ts`](/Users/hdkiller/Develop/coach-wattz/server/api/chat/messages.post.ts)
- [`server/utils/chat/turn-executor.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/chat/turn-executor.ts)
- [`server/utils/chat/history.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/chat/history.ts)
- [`server/utils/ai-history.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/ai-history.ts)
- [`server/utils/chat/tool-execution.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/chat/tool-execution.ts)
- [`server/utils/services/chatTurnService.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/services/chatTurnService.ts)
- [`server/utils/ws-state.ts`](/Users/hdkiller/Develop/coach-wattz/server/utils/ws-state.ts)

Frontend:

- [`app/pages/chat.vue`](/Users/hdkiller/Develop/coach-wattz/app/pages/chat.vue)
- [`app/components/chat/ChatMessageList.vue`](/Users/hdkiller/Develop/coach-wattz/app/components/chat/ChatMessageList.vue)
- [`app/components/chat/ChatMessageContent.vue`](/Users/hdkiller/Develop/coach-wattz/app/components/chat/ChatMessageContent.vue)

## 12. Documentation References

The legacy docs and migration notes still contain useful background, but they describe older phases of the system. Treat them as historical context, not as the current architecture contract.
