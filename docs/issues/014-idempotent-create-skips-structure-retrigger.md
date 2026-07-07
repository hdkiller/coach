# 014 — Idempotent `create_planned_workout` replay never re-enqueues structure

**Type:** Bug  
**Priority:** High  
**Area:** `ai`, `backend`, `workouts`  
**Status:** Open

## Description

When `create_planned_workout` hits an existing workout via deterministic `externalId` (idempotent replay), it returns success but **does not** check whether structure exists, re-trigger generation, or return a `run_id`.

## Root Cause

```867:876:server/utils/ai-tools/planning.ts
      if (existingByExternalId) {
        return {
          success: true,
          workout_id: existingByExternalId.id,
          message:
            args.generate_structure !== false
              ? 'Planned workout already exists for this chat turn.'
              : 'Planned workout already exists.'
        }
      }
```

The trigger block (lines 907–928) is skipped on cache hit.

## How this combines with other bugs

1. First attempt creates workout but trigger enqueue fails ([008](./008-chat-silent-trigger-failures.md)) → `{ success: true }` without `run_id`.
2. Idempotent replay (same `lineageId` + args) returns “already exists” → still no structure, no new job.
3. User/chat card stuck waiting forever ([016](./016-chat-card-infinite-poll-without-run-id.md)).

## Expected Behavior

On idempotent hit, if `generate_structure !== false` and workout has no renderable structure and no active generation run → re-enqueue and return `run_id` / `structure_status`.

## Acceptance Criteria

- [ ] Idempotent replay recovers from failed first trigger
- [ ] Response distinguishes `created` vs `already_exists` vs `structure_queued`
