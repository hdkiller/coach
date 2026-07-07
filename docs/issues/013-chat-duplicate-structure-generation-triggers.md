# 013 — Chat can enqueue multiple structure generations for one workout

**Type:** Bug  
**Priority:** High  
**Area:** `ai`, `workouts`, `backend`, `ui/ux`  
**Status:** Open  
**Reported:** User observed multiple workout-details/structure generation jobs when asking chat to create a running workout.

## Summary

When a user asks chat to **create a planned workout** (e.g. a run), the assistant can accidentally enqueue **multiple `generate-structured-workout` Trigger.dev runs** for the **same workout** in a single turn. This is a **real bug**, not expected behavior.

One user message should result in **at most one** structure generation job per workout.

## Why this happens

The `planning_write` skill exposes **several tools that each trigger structure generation independently**, and nothing deduplicates or coalesces them at the workout level.

### Tools that trigger `generate-structured-workout`

| Tool | When it triggers | Default |
|------|------------------|---------|
| `create_planned_workout` | After creating the workout shell | **`generate_structure` defaults to `true`** |
| `update_planned_workout` | After updating metadata | **`generate_structure` omitted → treated as `true`** (`undefined !== false`) |
| `generate_planned_workout_structure` | Explicit full rebuild | Always triggers |

All three are available together in `server/utils/chat/skills.ts` (`planning_write` tool list).

### Typical duplicate pattern (single chat turn)

The model often chains tools like this when creating a run:

```
1. create_planned_workout(type: "Run", ...)     → trigger #1
2. generate_planned_workout_structure(workout_id) → trigger #2  (redundant)
```

Or:

```
1. create_planned_workout(...)                  → trigger #1
2. update_planned_workout(title/description...) → trigger #2  (generate_structure not set to false)
```

Each call runs quota check + `generateStructuredWorkoutTask.trigger()` separately.

### No workout-level deduplication in the trigger task

`generate-structured-workout` has **no guard** for an already-queued or in-progress run for the same `plannedWorkoutId`. Multiple runs can queue back-to-back (serialized per user via `concurrencyKey`, but still all execute).

### Idempotency gaps in chat tool wrapper

`wrapChatToolsForExecution` (`server/utils/chat/tool-execution.ts`) dedupes **mutating** tools by `(lineageId, toolName, argsHash)`.

- `create_planned_workout` → **protected** (starts with `create_`)
- `update_planned_workout` → **protected** per exact args
- `generate_planned_workout_structure` → **NOT protected** (`generate_` prefix not in `isMutatingChatTool`)

So repeated `generate_planned_workout_structure` calls with the same args can each enqueue a new run.

Different tools (`create_*` vs `generate_*`) never share idempotency keys even for the same workout.

### UI amplifies the confusion

Each tool invocation renders its own `ChatPlannedWorkoutCard` (`app/components/chat/ChatMessageContent.vue`). A turn with `create_planned_workout` + `generate_planned_workout_structure` shows **two cards**, each polling run status — looks like "multiple workout details" were triggered.

```322:328:app/components/chat/ChatMessageContent.vue
      <ChatPlannedWorkoutCard
        v-else-if="showTools && shouldRenderPlannedWorkoutCard(part)"
        :tool-name="getPartToolName(part)"
        :response="getPartToolResponse(part)"
        :args="getPartToolArgs(part)"
      />
```

### Skill instructions don't prevent it

`planning_write` skill fragment (`server/utils/chat/skills.ts`) does **not** tell the model:

- "Do not call `generate_planned_workout_structure` after `create_planned_workout` — creation already starts structure generation."
- "Pass `generate_structure: false` on `update_planned_workout` unless the user asked to rebuild intervals."

## Side effects

- **2–3× quota consumption** for one user request ([009](./009-double-quota-consumption.md))
- **Race on persist** — later runs overwrite earlier structure; wasted LLM cost
- **Timeout noise** — multiple 45s×2 AI attempts in parallel queue
- **User confusion** — multiple "Structure generation running" indicators in chat

## How to verify (for your case)

If you still have the chat message, check the assistant turn for tool calls:

1. Open the message in chat (expand tools if shown).
2. Look for multiple cards or tool names among:
   - `create_planned_workout`
   - `update_planned_workout`
   - `generate_planned_workout_structure`
3. In Trigger.dev / developer runs, filter `generate-structured-workout` around that timestamp — you may see **multiple runs** tagged with the same `planned-workout:<id>`.

If only **one** tool ran but **multiple runs** appear, check for chat turn retry or a failed-then-retried user message (new `lineageId` → new workout + new generation).

## Expected behavior

- `create_planned_workout` with default `generate_structure: true` → **one** background generation job.
- Follow-up tools in the same turn should **not** re-trigger unless the user explicitly asked to regenerate structure.
- Chat UI should show **one** in-progress structure job per workout.

## Suggested fixes

### Quick wins

1. **Skill instruction** — Add explicit rule in `planning_write`:
   - After `create_planned_workout`, do not call `generate_planned_workout_structure`.
   - On `update_planned_workout`, default to `generate_structure: false` unless duration/type/intensity changed or user asked for rebuild.

2. **`update_planned_workout` schema** — Change default to `generate_structure: false` (opt-in regen, not opt-out).

3. **Trigger dedup** — At start of `generate-structured-workout`, skip or coalesce if another active run exists for same `plannedWorkoutId` (check Trigger.dev tags or persist `structureGenerationRunId` on workout).

4. **Include `generate_*` in mutating idempotency** — Add `generate_planned_workout_structure` and `adjust_planned_workout` to `isMutatingChatTool` (or a dedicated structure-trigger allowlist).

### Medium term

5. **Single structure trigger helper** — `enqueueStructureGeneration(plannedWorkoutId, { reason, force })` used by all tools; returns existing run id if already queued.

6. **Chat card consolidation** — One card per `workout_id` per message, not one per tool call.

## Related issues

- [008](./008-chat-silent-trigger-failures.md) — trigger failures hidden
- [009](./009-double-quota-consumption.md) — quota hit multiple times
- [012](./012-ai-in-triggers-architecture-rethink.md) — persisted generation status

## Acceptance criteria

- [ ] Single "create me a run" chat request enqueues exactly one `generate-structured-workout` run
- [ ] Model skill/tests discourage redundant `generate_planned_workout_structure` after create
- [ ] `update_planned_workout` does not regenerate structure unless explicitly requested
- [ ] Chat shows one structure-in-progress indicator per workout per turn
