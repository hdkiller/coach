# 015 — Approval turns break workout deduplication (duplicate creates)

**Type:** Bug  
**Priority:** Critical  
**Area:** `ai`, `backend`, `ui/ux`, `workouts`  
**Status:** Open

## Description

When tool approval is enabled, duplicate approvals or parallel approval submissions can create **multiple planned workouts** for a single user intent.

## Root Causes

### 1. Approval turns get a new `lineageId`

`create_planned_workout` keys `externalId` from chat `lineageId`:

```847:856:server/utils/ai-tools/planning.ts
      const deterministicExternalId = chatContext.lineageId
        ? `ai-turn-${hashToolArgs(
            buildToolIdempotencyKey(
              chatContext.lineageId,
              'create_planned_workout',
              hashToolArgs(args)
            )
          ).slice(0, 24)}`
```

Approval continuation runs on a **new turn** created from the approval tool message (`server/api/chat/messages.post.ts` ~183–198), which gets `lineageId = turn.id` (new UUID) in `chatTurnService.createTurn`.

Same args on two approval turns → **two different `externalId` values** → two workouts.

### 2. Double approval submission has no server guard

`ChatToolApproval.vue` sets `submitting = true` but `onToolApproval` in `app/pages/chat.vue` always appends a new tool message and calls `sendMessage()` with no deduplication by `approvalId`.

Double-click **Approve** → two turns → two creates (when combined with #1).

## Reproduction

1. Enable `aiRequireToolApproval`.
2. Ask chat to create a running workout.
3. Double-click Approve quickly.
4. Observe two planned workouts on the same date (or two structure generation jobs).

## Expected Behavior

- One approval → one workout maximum.
- Duplicate approval for same `approvalId` rejected server-side.
- `lineageId` inherited from originating user-message turn for deterministic `externalId`.

## Acceptance Criteria

- [ ] Double approval cannot create duplicate workouts
- [ ] Approval turns inherit stable lineage for idempotency
- [ ] Client disables approve button after first submit until result
