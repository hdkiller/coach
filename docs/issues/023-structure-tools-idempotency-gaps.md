# 023 — Structure trigger tools lack chat idempotency protection

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai`, `backend`  
**Status:** Open  
**Related:** [013](./013-chat-duplicate-structure-generation-triggers.md)

## Description

Chat tool wrapper dedupes mutating tools by `(lineageId, toolName, argsHash)`. Several structure-related tools are **not** classified as mutating, so identical repeated calls in one conversation lineage each execute fully.

## Root Cause

```113:129:server/utils/chat/turns.ts
export function isMutatingChatTool(toolName: string) {
  return (
    ...
    toolName.startsWith('patch_') ||
    ...
  )
}
```

**Not covered:**

| Tool | Prefix | Triggers structure? |
|------|--------|---------------------|
| `generate_planned_workout_structure` | `generate_` | Yes (async) |
| `adjust_planned_workout` | `adjust_` | Yes (async adjust task) |
| `set_planned_workout_structure` | `set_` | No (sync replace) |

`patch_planned_workout_structure` **is** covered; `set_planned_workout_structure` is not.

## Impact

- Model retries same `generate_planned_workout_structure` call → multiple Trigger runs ([013](./013-chat-duplicate-structure-generation-triggers.md)).
- Approved continuation for `set_*` is not short-circuited as mutating in `turn-executor.ts` (~695), so LLM stream may continue and issue follow-up writes.

## Suggested Fix

Extend mutating/idempotency list for structure enqueue and replace tools, or dedicated `isStructureMutatingTool()` helper.

## Acceptance Criteria

- [ ] Duplicate identical generate/adjust calls in one lineage return cached result / existing run id
- [ ] `set_planned_workout_structure` idempotent within lineage
