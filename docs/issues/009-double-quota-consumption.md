# 009 — Quota checked at API and again inside trigger

**Type:** Maintenance  
**Priority:** Medium  
**Area:** `backend`, `workouts`  
**Status:** Open

## Description

Structured workout generation quota (`generate_structured_workout`) is enforced at the API layer and again inside the Trigger.dev task. This creates ambiguous consumption behavior on failures and duplicates logic.

## Locations

**API** — `server/api/workouts/planned/[id]/generate-structure.post.ts` (~47–48):

```typescript
await checkQuota(userId, 'generate_structured_workout')
```

**Trigger** — `trigger/generate-structured-workout.ts` (~963–970):

```typescript
await checkQuota(workout.userId, 'generate_structured_workout')
// on failure: return { success: false, reason: 'QUOTA_EXCEEDED' }
```

Chat tools also check quota before triggering (`planning.ts`).

## Concerns

1. **Double charge?** — Depends on whether `checkQuota` increments on check vs on success. Needs verification in `server/utils/quotas/engine`.
2. **API passes, trigger fails quota** — User gets 200 from API but task returns `QUOTA_EXCEEDED` asynchronously.
3. **Nested triggers** (training block, chat) may skip API check but hit trigger check.

## Suggested Fix

- Single source of truth: enforce quota at enqueue time OR at task start, not both unless idempotent.
- Document quota consumption timing in [llm-quotas-and-limits.md](../06-plans/llm-quotas-and-limits.md).

## Acceptance Criteria

- [ ] Quota consumed exactly once per successful generation
- [ ] Failed generations do not consume quota (or policy is documented)
- [ ] No duplicate check logic without clear reason
