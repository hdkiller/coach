# 022 — Patch/set structure vs async generate/adjust race (last writer wins)

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai`, `backend`, `workouts`  
**Status:** Open  
**Related:** [013](./013-chat-duplicate-structure-generation-triggers.md)

## Description

In one chat turn, the model can call synchronous structure tools (`patch_planned_workout_structure`, `set_planned_workout_structure`) and async tools (`generate_planned_workout_structure`, `adjust_planned_workout`) on the same workout. There is no lock, epoch, or job cancellation — **whichever finishes last wins**.

## Root Cause

Independent code paths in `planning.ts`:

- **Sync:** patch (~786–793), set — immediate DB write via `buildStructureEditFields`
- **Async:** generate (~1216–1221), adjust (~1171–1184) — Trigger.dev tasks overwrite full structure on completion

No shared `structureGenerationStatus` or in-flight guard ([012](./012-ai-in-triggers-architecture-rethink.md)).

## Reproduction

Single chat turn:

1. `patch_planned_workout_structure` — user-visible “patched successfully”
2. `generate_planned_workout_structure` — async job overwrites patch when complete

## Expected Behavior

- Reject patch/set while generation in flight, or cancel superseded jobs.
- Skill rule: never patch and full-regenerate same workout in one turn.

## Acceptance Criteria

- [ ] Concurrent sync edit + async generate cannot silently discard user-visible edits
- [ ] Tool results indicate when a later async job may overwrite changes
