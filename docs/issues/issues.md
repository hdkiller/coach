# Workout Details Generation — Issue Tracker

Last reviewed: 2026-07-07 (second pass — chat + structure generation)

This tracker documents bugs, UX gaps, and architectural concerns found during a code review of **planned workout structure generation** (the AI pipeline that produces interval steps, strength blocks, coach instructions, and related metadata for the Planned Workout Details page).

No code changes were made as part of this review — only issue documentation.

## Scope

**In scope**

- `generate-structured-workout` and related Trigger.dev tasks
- API endpoints that enqueue structure generation
- Planned Workout Details UI monitoring and feedback
- Chat planning tools that trigger background generation
- Timeout and retry behavior for AI calls inside triggers

**Out of scope (related but separate)**

- Completed workout AI analysis (`analyze-workout`)
- Read-only chat tools (`get_workout_details`, `get_planned_workout_details`)
- Intervals.icu publish/sync failures (deferred in support tracker)

## Architecture Summary

```mermaid
flowchart LR
    subgraph entry [Entry Points]
        UI[Planned Workout Details]
        Dashboard[Plan Dashboard]
        Chat[Chat Planning Tools]
        Block[generate-training-block]
        AdHoc[generate-ad-hoc-workout]
    end

    subgraph trigger [Trigger.dev]
        GSW[generate-structured-workout<br/>maxDuration 180s]
        ASW[adjust-structured-workout<br/>maxDuration 180s]
    end

    subgraph ai [AI Layer]
        Gemini[generateStructuredAnalysis<br/>45s timeout per attempt]
    end

    UI --> GSW
    Dashboard --> GSW
    Chat --> GSW
    Block --> GSW
    AdHoc --> GSW
    GSW --> Gemini
    ASW --> Gemini
```

Chat turns have a separate **60s execution timeout** (`CHAT_TURN_EXECUTION_TIMEOUT_MS`). Structure generation is correctly offloaded to Trigger.dev in most paths, but several triggers still run **synchronous multi-attempt AI** inside the task body, which can approach the 180s task cap.

## Production Context

Prior support investigation confirms an active defect family around **zero-step structured workouts** (description-only `structuredWorkout` payloads with `step_count = 0`). See:

- [support-ticket-task-list-2026-06-16.md](../06-plans/support-ticket-task-list-2026-06-16.md) — cluster 3
- [support-ticket-handoff-2026-06-25.md](../06-plans/support-ticket-handoff-2026-06-25.md)

Anchor support tickets: `0d62fa04-884d-4fcd-a328-2226f2eb4ad5`, `a232e0ab-245e-4e95-ac37-e03fa7db6e37`, `10565730-46cd-4422-bef3-edf8b16d7df7`

## Issues

| ID | Title | Priority | Type | Status |
|----|-------|----------|------|--------|
| [001](./001-zero-step-structure-persistence.md) | Empty structures can persist as successful generation | Critical | Bug | Open |
| [002](./002-missing-planned-workout-run-tags.md) | Manual/API triggers missing `planned-workout:` run tags | High | Bug | Open |
| [003](./003-free-tier-skip-reports-success.md) | Free-tier skip returns `success: true` → misleading toast | Medium | Bug | Open |
| [004](./004-no-task-failure-handling.md) | No `onTaskFailed` handler — stuck "Generating..." state | High | Bug | Open |
| [005](./005-page-reload-loses-generation-state.md) | Page reload does not restore in-progress generation UI | Medium | Bug | Open |
| [006](./006-ui-timeout-messaging-mismatch.md) | UI says "30 seconds" but task can take up to ~180s | Low | Bug | Open |
| [007](./007-workout-messages-no-ai-timeout.md) | `generate-workout-messages` has no explicit AI timeout | Medium | Bug | Open |
| [008](./008-chat-silent-trigger-failures.md) | Chat tools swallow structure trigger failures | High | Bug | Open |
| [009](./009-double-quota-consumption.md) | Quota checked at API and again inside trigger | Medium | Maintenance | Open |
| [010](./010-batch-generation-loading-state.md) | Batch week generation clears loading before jobs finish | Medium | Bug | Open |
| [011](./011-strength-blocks-validation-gap.md) | Final validation ignores `blocks`-only strength structures | Medium | Bug | Open |
| [012](./012-ai-in-triggers-architecture-rethink.md) | Rethink AI-in-triggers pattern and timeout strategy | High | Architecture | Open |
| [013](./013-chat-duplicate-structure-generation-triggers.md) | Chat creates multiple structure generation jobs for one workout | High | Bug | Open |
| [014](./014-idempotent-create-skips-structure-retrigger.md) | Idempotent create replay never re-enqueues structure | High | Bug | Open |
| [015](./015-approval-turn-duplicate-workouts.md) | Approval turns / double-submit create duplicate workouts | Critical | Bug | Open |
| [016](./016-chat-card-infinite-poll-without-run-id.md) | Chat card polls forever when enqueue fails without run_id | Medium | Bug | Open |
| [017](./017-modify-plan-structure-planservice-crash.md) | `modify_training_plan_structure` crashes (missing import) | Critical | Bug | Open |
| [018](./018-structure-tools-bypass-approval.md) | `adjust` / `generate_planned_workout_structure` bypass approval | High | Bug | Open |
| [019](./019-chat-ui-ignores-strength-blocks.md) | Chat UI ignores blocks-only strength structures | Medium | Bug | Open |
| [020](./020-intervals-publish-before-structure-ready.md) | Intervals shell published before structure exists | Medium | Bug | Open |
| [021](./021-recommend-workout-stub-data.md) | `recommend_workout` returns hardcoded stub data | Medium | Bug | Open |
| [022](./022-patch-vs-async-generation-race.md) | Patch/set vs async generate race (last writer wins) | Medium | Bug | Open |
| [023](./023-structure-tools-idempotency-gaps.md) | `generate_` / `adjust_` / `set_` tools skip chat idempotency | Medium | Bug | Open |
| [024](./024-chat-card-wrong-workout-fallback.md) | Chat card fuzzy ID fallback attaches wrong workout | Medium | Bug | Open |
| [025](./025-planned-workout-details-context-bloat.md) | `get_planned_workout_details` bloats LLM context | Low | Bug | Open |
| [026](./026-structure-tools-missing-preflight.md) | Generate/adjust tools skip sync workout existence check | Medium | Bug | Open |

## Chat + Structure Generation — Issue Clusters

These groups help explain user-reported symptoms like “multiple workout details triggered when I asked chat to create a run.”

### Duplicate jobs / duplicate workouts

- [013](./013-chat-duplicate-structure-generation-triggers.md) — tool chain: `create` + `generate_planned_workout_structure` + `update`
- [015](./015-approval-turn-duplicate-workouts.md) — double Approve / new approval turn lineage
- [023](./023-structure-tools-idempotency-gaps.md) — repeated generate/adjust calls not deduped

### Failed generation with misleading success UI

- [008](./008-chat-silent-trigger-failures.md) — trigger failure swallowed
- [014](./014-idempotent-create-skips-structure-retrigger.md) — replay cannot recover
- [016](./016-chat-card-infinite-poll-without-run-id.md) — infinite “Waiting for structure”
- [024](./024-chat-card-wrong-workout-fallback.md) — polls wrong workout

### Wrong or incomplete structure display

- [019](./019-chat-ui-ignores-strength-blocks.md) — blocks-only strength
- [001](./001-zero-step-structure-persistence.md) — empty steps persisted
- [020](./020-intervals-publish-before-structure-ready.md) — empty Intervals export window

### Model / tool routing confusion

- [021](./021-recommend-workout-stub-data.md) — stub recommends Ride when user asked Run
- [025](./025-planned-workout-details-context-bloat.md) — oversized tool results
- [022](./022-patch-vs-async-generation-race.md) — conflicting edits in one turn

## Recommended Fix Order

1. **001** — Add a hard pre-persist guard rejecting empty/non-renderable structures (blocks the production zero-step pattern).
2. **017** — Fix `planService` import (runtime crash on plan structure edits via chat).
3. **013 + 015 + 023** — Stop duplicate structure triggers and duplicate workouts from chat.
4. **008 + 014 + 016** — Failed enqueue recovery (server errors + chat card terminal states).
5. **002 + 004 + 005** — Fix run tagging and failure/state recovery on the Planned Workout Details page.
6. **018** — Align approval policy for expensive structure tools.
7. **012** — Align timeout policy; persisted generation status on `PlannedWorkout`.
8. Remaining medium/low items (019–022, 020–021, 024–026).

## Key Files

| Area | Path |
|------|------|
| Main generation task | `trigger/generate-structured-workout.ts` |
| Adjustment task | `trigger/adjust-structured-workout.ts` |
| AI wrapper | `server/utils/gemini.ts` |
| Manual trigger API | `server/api/workouts/planned/[id]/generate-structure.post.ts` |
| Chat planning tools | `server/utils/ai-tools/planning.ts` |
| Details page UI | `app/pages/workouts/planned/[id]/index.vue` |
| Run monitoring | `app/composables/useUserRuns.ts` |
| Chat turn timeouts | `server/utils/chat/turns.ts`, `server/utils/chat/turn-executor.ts` |

## Chat / Trigger Timeout Notes

From this review and the user's concern about **AI generation inside triggers timing out**:

- Chat tools correctly **enqueue** structure generation rather than waiting for completion — this avoids the 60s chat turn limit for the heavy AI work.
- The timeout pain is more likely in **Trigger.dev tasks** running synchronous AI with 45s × 2 attempts plus post-processing (strength library matching, coverage validation retries), approaching the **180s `maxDuration`**.
- Several related triggers (`generate-ad-hoc-workout`, `generate-workout-messages`) call `generateStructuredAnalysis` **without `timeoutMs`**, creating inconsistent hang behavior.
- See [012](./012-ai-in-triggers-architecture-rethink.md) for proposed direction.
