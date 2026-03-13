# Chatroom Debugging

This guide covers the fastest workflow for debugging chat rooms, missing responses, approval flows, and tool-calling failures in development and production.

## Primary Tool

Use the new chatroom debugger first:

```bash
pnpm cw:cli debug chatroom
```

By default, it inspects the latest updated room in the development database.

Useful variants:

```bash
pnpm cw:cli debug chatroom <roomId>
pnpm cw:cli debug chatroom --turn <turnId>
pnpm cw:cli debug chatroom --user <email-or-user-id>
pnpm cw:cli debug chatroom --prod
pnpm cw:cli debug chatroom --prod --json
```

## What The Command Shows

For the selected room, the command prints:

- Room metadata and participants
- Recent turns and recent messages
- Skill selection and whether tools were enabled
- Turn events such as `slow_response`, `first_output_received`, `turn_completed`, and interruptions
- Tool executions for each turn
- Findings for common failure modes

Current built-in findings include:

- Tool-enabled turn completed without any tool execution
- Executor fallback response was persisted
- Empty-response retry happened
- Heartbeat timeout interrupted the turn
- Approval reply arrived but no tool executed
- Plain-text confirmation happened without a tool-driven approval request

## Recommended Workflow

When a chat looks broken:

1. Run `pnpm cw:cli debug chatroom` or point it at the room or turn you care about.
2. Check whether the backend persisted an assistant message.
3. Check whether the turn was tool-enabled.
4. Check whether any `tool_call_started` or tool execution rows exist.
5. Compare the last user message with the final assistant message and the findings section.

This separates the common cases quickly:

- Backend completed and saved a message, but the UI did not update.
- The model produced text but never called tools.
- A mutating tool ran, but the follow-up response failed.
- An approval flow resumed, but no tool executed after the user confirmed.

## Tool-Calling Debugging

When a turn should have called a tool:

1. Confirm the skill selection shows `useTools: true`.
2. Check the selected skill IDs and the selected tool list in turn metadata.
3. Look for tool executions and `tool_call_started` / `tool_call_completed` events.
4. If there are no tool executions, check whether the assistant fell back to plain text, an empty-response retry, or a generic executor fallback message.

Helpful companion commands:

```bash
pnpm cw:cli debug chat <roomId>
pnpm cw:cli debug chat-gemini --roomId <roomId>
pnpm cw:cli debug llm-request <llmUsageId> --prod
```

Use them for deeper inspection when the chatroom summary already narrowed the failure down.

## Interpreting Common Patterns

`tool_enabled_without_tool_execution`

- The router and tool selection were likely correct.
- The failure is usually model behavior or a continuation-context gap.

`executor_fallback_response`

- The turn completed, but the executor had to emit the generic fallback response.
- This usually means the model returned empty or unusable output.

`approval_reply_without_execution`

- The user appears to have approved a prepared action.
- The follow-up turn did not execute the approved tool.

`heartbeat_timeout`

- The turn stopped heartbeating after work began.
- This usually points to an executor crash, restart, or stuck process rather than a pure prompting issue.

## UI Sync vs Backend Failure

If the command shows:

- a completed turn,
- a saved assistant message,
- and no interruption,

then the backend finished and the issue is probably on the client side, usually realtime delivery or final polling/reconciliation.

If the command shows:

- no saved assistant message,
- interrupted or failed status,
- or a generic fallback response,

then the issue is backend execution or model behavior.
