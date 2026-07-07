# 017 — `modify_training_plan_structure` crashes (`planService` undefined)

**Type:** Bug  
**Priority:** Critical  
**Area:** `ai`, `backend`, `planning`  
**Status:** Open

## Description

Chat tool `modify_training_plan_structure` references `planService.replanStructure` but **`planService` is never imported** in `planning.ts`. Any chat request to modify plan block structure throws at runtime.

## Root Cause

```1529:1531:server/utils/ai-tools/planning.ts
        await planService.replanStructure(userId, plan_id, finalBlocks)
```

Imports (lines 1–47) include repositories and `metabolicService`, but not `planService` from `server/utils/services/planService.ts` (used correctly in `server/api/plans/[id]/replan-structure.post.ts`).

## Reproduction

Ask chat to restructure a training plan (add/remove/reorder blocks) → tool fails with `ReferenceError: planService is not defined`.

## Suggested Fix

```typescript
import { planService } from '../services/planService'
```

## Acceptance Criteria

- [ ] Tool executes without ReferenceError
- [ ] Unit test covers import and happy path
