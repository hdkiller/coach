# 018 — `adjust_planned_workout` and `generate_planned_workout_structure` bypass approval

**Type:** Bug  
**Priority:** High  
**Area:** `ai`, `backend`, `workouts`  
**Status:** In Progress ([PR #221](https://github.com/hdkiller/coach/pull/221))

## Description

When `aiRequireToolApproval` is enabled, expensive structure mutations can run **without user approval**, unlike `create_planned_workout`, `patch_planned_workout_structure`, etc.

## Root Cause

Neither tool defines `needsApproval`:

- `adjust_planned_workout` (~1143)
- `generate_planned_workout_structure` (~1202)

Both are also **absent** from `planning_write.approvalToolNames` in `server/utils/chat/skills.ts` (lines 185–195).

## Impact

- User asks chat to “regenerate tomorrow’s run intervals” → immediate quota use + Trigger enqueue with no approval UI.
- Contributes to duplicate generation when combined with [013](./013-chat-duplicate-structure-generation-triggers.md) (create already triggered structure, model also calls generate).

## Expected Behavior

Respect `aiSettings.aiRequireToolApproval` like other planning write tools.

## Acceptance Criteria

- [ ] Both tools require approval when setting enabled
- [ ] Listed in skill approval instructions
