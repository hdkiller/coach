# 012 — Rethink AI-in-triggers pattern and timeout strategy

**Type:** Architecture  
**Priority:** High  
**Area:** `ai`, `backend`, `infra`, `workouts`  
**Status:** Open

## Summary

The current design offloads heavy work to Trigger.dev (correct), but still runs **synchronous, multi-attempt AI calls inside task bodies**. Timeout configuration is **inconsistent** across tasks, and the UI has **no durable generation status model** on the workout record itself. This combination causes timeouts, stuck UI states, and silent partial failures — especially when generation is triggered from chat or batch plan flows.

This issue captures the user's concern: *"Sometimes I have AI generation in triggers which times out — maybe we need to rethink how we will do this."*

## Current State

### What works well

| Pattern | Detail |
|---------|--------|
| Chat → async trigger | Planning tools enqueue `generate-structured-workout` instead of blocking the 60s chat turn |
| Two-stage planning | `generate-training-block` creates workout shells; structure is a separate task |
| Retry with model upgrade | 45s timeout, attempt 1 Flash → attempt 2 Pro + high thinking |
| WebSocket run updates | `useUserRuns` + `publishTaskRunStartedEvent` for live status |

### What causes pain

| Problem | Detail |
|---------|--------|
| **Synchronous AI in long tasks** | Up to 2×45s AI + strength matching + coverage retries + DB + Intervals sync in one 180s task |
| **Inconsistent timeouts** | `generate-structured-workout`: 45s explicit; `generate-ad-hoc-workout`, `generate-workout-messages`: no `timeoutMs` |
| **Task timeout vs AI timeout** | Task fails at 180s with unclear user message; UI may stay stuck ([004](./004-no-task-failure-handling.md)) |
| **No persisted generation status** | UI infers state from Trigger.dev run tags — fragile ([002](./002-missing-planned-workout-run-tags.md), [005](./005-page-reload-loses-generation-state.md)) |
| **Chat success without structure** | Workout created, trigger fails silently ([008](./008-chat-silent-trigger-failures.md)) |
| **Batch fan-out** | `generate-training-block` loops `tasks.trigger` for many workouts — queue pressure, no per-block progress |
| **Validation after AI spend** | Empty or invalid structures can still persist in edge cases ([001](./001-zero-step-structure-persistence.md)) |

### Timeout matrix (workout-related triggers)

| Task | maxDuration | AI timeoutMs | Notes |
|------|-------------|--------------|-------|
| `generate-structured-workout` | 180s | 45s × 2 attempts | Manual retry at task level |
| `adjust-structured-workout` | 180s | 45s × 2 attempts | Same |
| `generate-workout-messages` | 300s | **None** | Default SDK retries |
| `generate-ad-hoc-workout` | 300s | **None** on first AI call | Then chains structure task |
| `generate-training-block` | 600s | 40s DB tx timeout | Fans out N structure tasks |
| `execute-chat-turn` | 300s | 60s execution abort | Separate from structure gen |

Chat turn limits (`server/utils/chat/turns.ts`):

- `CHAT_TURN_EXECUTION_TIMEOUT_MS = 60_000`
- `CHAT_TURN_HEARTBEAT_TIMEOUT_MS = 120_000`

Chat tool spec still mentions "5s max" for tools (`docs/02-features/chat/tool-calling-spec.md`) — outdated vs actual async trigger pattern.

## Architectural Options

### Option A — Harden current async trigger model (incremental)

**Keep** Trigger.dev tasks as the unit of work. **Improve**:

1. **Unified AI timeout policy** — shared constant, all trigger AI calls use `timeoutMs` + bounded retries.
2. **Pre-persist validation gate** — shared `assertRenderableStructure()` ([001](./001-zero-step-structure-persistence.md), workout safety layer plan).
3. **`PlannedWorkout.structureGenerationStatus` field** — `idle | queued | running | failed | complete` + `lastError` + `lastRunId`. UI reads DB first, runs second.
4. **Standard run tags** — helper for all enqueue sites ([002](./002-missing-planned-workout-run-tags.md)).
5. **Split long tasks** — move Intervals sync to a separate chained task so AI budget isn't shared with network I/O.

**Pros:** Smallest migration, fits existing Trigger.dev investment.  
**Cons:** Still synchronous AI within tasks; complex workouts may keep hitting 180s.

### Option B — Two-step trigger chain (AI job → persist job)

Split each generation into:

1. **`generate-structure-draft`** — AI only, returns draft JSON to task output / object storage.
2. **`persist-structure-draft`** — deterministic compile, validate, quota, DB write, sync.

On AI timeout, retry **only** step 1 without re-loading full workout context.

**Pros:** Clear failure boundaries, cheaper retries, easier observability.  
**Cons:** More tasks, need draft storage contract.

### Option C — Queue worker with slot-based concurrency

Dedicated queue for structure generation with:

- Per-user concurrency = 1 (already partially via `concurrencyKey`)
- Global rate limit for Gemini
- Priority lanes (user-initiated > batch block > backfill)

**Pros:** Protects against batch block stampedes.  
**Cons:** Infrastructure complexity.

### Option D — Chat returns immediately with explicit follow-up contract

Chat tools always:

1. Create/update planned workout shell.
2. Enqueue structure task.
3. Return `{ workout_id, run_id, structure_status: 'queued' }`.
4. Chat assistant tells user structure is **building in background** — link to planned workout page.

Never imply structure is ready in the same turn.

**Pros:** Sets correct user expectations; aligns with 60s chat limit.  
**Cons:** Requires chat prompt/card UX updates.

## Recommended Direction

**Phase 1 (short term):** Option A + D

- Fix validation, tags, failure handlers, chat error propagation.
- Add `structureGenerationStatus` on `PlannedWorkout`.
- Standardize timeouts across all workout AI triggers.

**Phase 2 (medium term):** Option B for `generate-structured-workout`

- Separate AI draft from persist/sync.
- Implement workout safety layer from [workout-safety-layer-plan.md](../../plans/training/workout-safety-layer-plan.md).

**Phase 3:** Option C if batch generation or Pro tier volume causes queue saturation.

## Chat Integration Notes

From product chat review (not stored transcripts — runtime chat history only):

- Chat **should not** wait for structure completion in-tool (would hit 60s execution timeout).
- Chat **should** surface trigger enqueue failures ([008](./008-chat-silent-trigger-failures.md)).
- Chat cards (`ChatPlannedWorkoutCard`) could show structure status from `structureGenerationStatus` once added.
- Tool-calling spec timeout guidance (5s) should be updated to reflect async trigger pattern.

## Open Questions

1. Should quota consume on enqueue or on successful persist?
2. Should failed structure generation auto-retry with backoff, or require user action?
3. For batch block generation, generate week 1 only synchronously and defer later weeks?
4. Should `draft_json_v1` become the only path (drop `legacy_json`) to reduce prompt size and timeout rate?

## Acceptance Criteria (architecture track)

- [ ] Documented timeout policy applied to all workout AI triggers
- [ ] Persisted generation status on `PlannedWorkout` (or equivalent)
- [ ] Chat and UI show consistent async "building structure" state
- [ ] Task failure rate and P95 duration tracked per operation in LLM ops panel
- [ ] Zero-step persistence rate trends down after validation gate

## References

- [issues.md](./issues.md) — full issue index
- [goal-driven-training.md](../02-features/goal-driven-training.md) — two-stage plan architecture
- [workout-safety-layer-plan.md](../../plans/training/workout-safety-layer-plan.md)
- [llm-ops-control-panel.md](../06-plans/llm-ops-control-panel.md)
