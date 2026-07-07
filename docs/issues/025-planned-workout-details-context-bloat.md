# 025 — `get_planned_workout_details` dumps unbounded context into chat

**Type:** Bug  
**Priority:** Low  
**Area:** `ai`, `backend`  
**Status:** Open

## Description

Unlike focused `get_planned_workout_structure`, `get_planned_workout_details` spreads the full Prisma record (nested `trainingWeek.block.plan`, entire `structuredWorkout`) into the LLM tool result — bloating tokens, slowing turns, and confusing the model between read vs mutate tools.

## Root Cause

```606:624:server/utils/ai-tools/planning.ts
      const workout = await plannedWorkoutRepository.getById(workout_id, userId, {
        include: {
          trainingWeek: { include: { block: { include: { plan: true } } } }
        }
      })
      ...
      return {
        ...workout,
        date: formatDateUTC(workout.date)
      }
```

## Impact on structure generation

- Large step trees echoed back into context → model may over-call `generate_planned_workout_structure` or patch incorrectly.
- Slower chat turns increase timeout risk ([012](./012-ai-in-triggers-architecture-rethink.md)).

## Suggested Fix

Return curated summary (metadata, structure summary, generation status); direct model to `get_planned_workout_structure` for step-level work.

## Acceptance Criteria

- [ ] Tool result size bounded for typical workouts
- [ ] Structure edits routed to structure-specific tools
